import express from 'express';
const router = express.Router()
import mysql from 'mysql2';
import axios from 'axios';
import GetUser from '../github/data/getUser.js';

router.get('/', (req, res) => {
    res.send('welcome to syntax portocol');
})

let con = null;

const mysqlConfig ={
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
}

router.get('/connect', (req, res)=>{
    con = mysql.createConnection(mysqlConfig);
    con.connect( (err)=>{
        if(err) throw err;
        res.send('connected');
    })
})

router.get('/create-table', (req,res)=>{
    con.connect((err)=>{
        if(err) throw err;
        const sql = `
        CREATE TABLE IF NOT EXISTS numbers(
            id INT AUTO_INCREMENT PRIMARY KEY,
            number INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=INNODB;
        `;
        con.query(sql, (err, result)=>{
            if(err) throw err;
            res.send("numbers table created");
        });
    });
});

router.get('/insert', (req,res)=>{
    const number = Math.round(Math.random()*100);
    con.connect((err)=>{
        if(err) throw err;
        const sql = `INSERT INTO numbers (number) VALUES (${number})`
        con.query(sql, (err, result)=>{
            if(err) throw err;
            res.send(`${number} inserted into table`)
        })
    })
})

router.get('/fetch',(req, res)=>{
    con.connect((err)=>{
        if(err) throw err;
        const sql = 'SELECT * FROM numbers'
        con.query(sql, (err, result, fields)=>{
            if(err) throw err;
            res.send(JSON.stringify(result))
        })
    })
})

function createEnumTable (name){
    con = mysql.createConnection(mysqlConfig);
    con.connect( (err)=>{
        if(err) throw err;
        console.log('connected');

        const sql = `
        CREATE TABLE IF NOT EXISTS lists(
            list_id TEXT NOT NULL,
            username TEXT NOT NULL,
            repository TEXT NOT NULL,
            file_extension TEXT NOT NULL,
            source TEXT NOT NULL,
            list_created_by TEXT NOT NULL,
            list_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=INNODB;
        `;
        con.query(sql, (err, result)=>{
            if(err) throw err;
            console.log(`${name} table created`);
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
            // console.log(`${user_name} inserted into table`)
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
                                commit.author.login,
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

router.post('/create', async (req, res)=>{
    const{enumName, enumList} = req.body;
    const accessToken = req.headers.authorization;

    await createEnumTable(enumName);

    const listCreator = await GetUser(accessToken);

    await getUsersOfRepo(listCreator?.login, accessToken,enumList, enumName);

    res.send({enumName, enumList});
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
        const sql= `select distinct username, list_id,  source, list_created_at from lists where list_id = '${listid}'`
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