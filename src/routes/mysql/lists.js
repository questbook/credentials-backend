import express from 'express';
const router = express.Router()
import mysql from 'mysql2';
import axios from 'axios';
import GetUser from '../github/data/getUser.js';

let con = null;

const mysqlConfig ={
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
}

function createEnumTable (){
    con = mysql.createConnection(mysqlConfig);
    con.connect( (err)=>{
        if(err) throw err;
        console.log('connected');

        const sql = `
        CREATE TABLE IF NOT EXISTS lists(
            list_id TEXT NOT NULL,
            username TEXT,
            erc721_address TEXT,
            erc721_name TEXT,
            repository TEXT,
            file_extension TEXT,
            source TEXT NOT NULL,
            list_created_by TEXT NOT NULL,
            list_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=INNODB;
        `;
        con.query(sql, (err, result)=>{
            if(err) throw err;
            console.log(`lists table created`);
        });
    })
    
}

async function insertRowInEnumListinser(list_id, username, repository, file_extension, source, list_created_by) {
    con.connect((err)=>{
        if(err) throw err;
        const sql = `INSERT INTO lists (list_id, username, repository, file_extension, source, list_created_by)
                        VALUES ('${list_id}', '${username}', '${repository}', '${file_extension}', '${source}', '${list_created_by}')`
        con.query(sql, (err, result)=>{
            if(err) throw err;
        })
    })
}

async function getUsersOfRepo(listCreator, accessToken, enumList, enumName) {
    const headers = {Authorization: `Bearer ${accessToken}`};
    const usersLists = [];
    enumList.map(async (obj,i)=>{
        
        axios.get(`https://api.github.com/repos/${obj.repo_name}/commits`, {headers: headers})
        .then(res=>{
            
            const repo_commit ={};
            if(res.data.length>0){
                const allCommits = res.data;
                return Promise.all(allCommits.map(async (commit, i)=>{
                    const commit_files_data = await axios.get(`https://api.github.com/repos/${obj.repo_name}/commits/${commit.sha}`, {headers: headers})
                                                .then((res)=>res.data);
                    
                    commit_files_data?.files.map((file,i)=>{
                        if(obj.file_extension===file.filename?.split('.')[1]){
                            // console.log(obj.repo_name, commit.author.login);
                            // console.log("repo name", obj.repo_name, res.data.length, commit_files_data?.files.length);
                            insertRowInEnumListinser(
                                enumName,
                                commit?.author?.login,
                                obj.repo_name,
                                obj.file_extension,
                                'github', //needs to be fetched from an enum
                                listCreator);
                        }
                    })

                    return commit_files_data;
                })).then((allcommitfiles)=>{
                    repo_commit[obj.repo_name] = {
                        commits: allcommitfiles,
                    };
                    return repo_commit;
                });   
            }else{
                repo_commit[obj.repo_name] = {
                    commits: res.data,
                };
                return repo_commit;
            }
        })
        .catch(err=>{console.log(err)});
    })
}

function deconstructQuery(query){
    const fileextension_regex = /file-extension EQUALS\s*"(.*?)"/ig
    const repos_regex = /repository IN\s*\((.*?)\)/ig
    const each_repo_regex = /"(.*?)"/g

    const file_extension_query = query.match(fileextension_regex);
    const file_extensions = file_extension_query[0].match(each_repo_regex);

    const repos_query = query.match(repos_regex);
    const repos = repos_query[0].match(each_repo_regex);

    let queryLists = [];
    repos.map((repo)=>{
        const obj = {}
        obj['repo_name'] = repo.replaceAll('"','');
        obj['file_extension'] = file_extensions[0].replaceAll('"','');
        queryLists.push(obj);
    });
    return queryLists;
}

function deconstructNftQuery(nftQuery){
    const erc721_regex = /contract-address EQUALS\s*"(.*?)"/ig
    const remove_quotes_regex = /"(.*?)"/g

    const contract_query = nftQuery.match(erc721_regex);
    const smartcontract_address = contract_query[0].match(remove_quotes_regex);

    return smartcontract_address[0].toLowerCase();
}

async function inserterc721DataToDb(listName, data, listCreator){
    const{tokenRegistry} = data;
    const {id:address, name, tokens: holders} = tokenRegistry;
    await createEnumTable();

    holders?.map((owner)=>{
        con.connect((err)=>{
            if(err) throw err;
            const sql = `INSERT INTO lists (list_id, username, erc721_address, erc721_name, source, list_created_by)
                            VALUES ('${listName}', '${owner.owner.id}', '${address}', '${name}', 'erc721', '${listCreator?.login}')`
            con.query(sql, (err, result)=>{
                if(err) throw err;
            })
        })
    });
}

router.post('/create', async (req, res)=>{
    const{enumName, githubQuery} = req.body;
    const accessToken = req.headers.authorization;

    const queryLists = deconstructQuery(githubQuery);
    
    console.log(queryLists.toString());

    await createEnumTable();

    const listCreator = await GetUser(accessToken);

    await getUsersOfRepo(listCreator?.login, accessToken, queryLists, enumName);

    res.send({enumName, queryLists});
})


router.post('/create-erc721-list', async (req, res)=>{
    const{enumName, nftQuery} = req.body;
    const accessToken = req.headers.authorization;
    const smartcontract_address = deconstructNftQuery(nftQuery);

    const result = await axios.post('https://api.thegraph.com/subgraphs/name/amxx/eip721-subgraph',{
      query:`
      {
        tokenRegistry(id:${smartcontract_address}){
          id
          name
          symbol
          tokens{
            owner{
              id
            }
          }
        }
      }`
    });

    const listCreator = await GetUser(accessToken);
    await inserterc721DataToDb(enumName, result.data.data, listCreator);

    res.send(JSON.stringify(result.data.data));
})

router.post('/getlists', async (req, res)=>{
    const {user_name}=req.body;
    con = mysql.createConnection(mysqlConfig);
    con.connect((err)=>{
        if(err) throw err;
        const sql= `select distinct list_id, list_created_by from lists where username = '${user_name}'`
        con.query(sql, (err, result, fields)=>{
            if(err) throw err;
            res.send(result);
        })
    })
})

router.get('/lists/:listid', async (req, res)=>{
    const {listid} = req.params;
    con = mysql.createConnection(mysqlConfig);
    con.connect((err)=>{
        if(err) throw err;
        const sql= `select distinct username, list_id,  source, list_created_at, erc721_name from lists where list_id = '${listid}'`
        con.query(sql, (err, result, fields)=>{
            if(err) throw err;
            res.send(result);
        })
    })
})

router.get('/users/:userid', async (req, res)=>{
    const {userid} = req.params;
    con = mysql.createConnection(mysqlConfig);
    con.connect((err)=>{
        if(err) throw err;
        const sql= `select distinct list_id, list_created_by from lists where username = '${userid}'`
        con.query(sql, (err, result, fields)=>{
            if(err) throw err;
            res.send(result);
        })
    })
})

router.get('/users/:userid/lists/:listid', async (req, res)=>{
    const {userid, listid} = req.params;
    con = mysql.createConnection(mysqlConfig);
    con.connect((err)=>{
        if(err) throw err;
        const sql= `select count(distinct list_id) as count from lists where username = '${userid}' and list_id = '${listid}'`
        con.query(sql, (err, result, fields)=>{
            if(err) throw err;
            res.send(result[0].count>0?true:false);
        })
    })
})

export default router;