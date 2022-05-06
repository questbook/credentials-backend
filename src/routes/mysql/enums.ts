import express from 'express';
const router = express.Router()
import mysql from 'mysql2';
import axios from 'axios';

router.get('/', (req, res) => {
    res.send('welcome to syntax portocol');
})

let con = null;

const mysqlConfig ={
    host: "credentials_mysql",
    user: "sourav",
    password: "Sourav_questbook",
    database: "credentials",
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
        CREATE TABLE IF NOT EXISTS enumlists(
            list_name TEXT NOT NULL,
            user_name TEXT NOT NULL,
            repo_name TEXT NOT NULL,
            file_extension TEXT NOT NULL
        ) ENGINE=INNODB;
        `;
        con.query(sql, (err, result)=>{
            if(err) throw err;
            console.log(`${name} table created`);
        });
    })
    
}

async function insertRowInEnumListinser(list_name, user_name, repo_name, file_extension) {
    con.connect((err)=>{
        if(err) throw err;
        const sql = `INSERT INTO enumlists (list_name, user_name, repo_name, file_extension) VALUES ('${list_name}', '${user_name}', '${repo_name}', '${file_extension}')`
        con.query(sql, (err, result)=>{
            if(err) throw err;
            console.log(`${user_name} inserted into table`)
        })
    })
}

async function getUsersOfRepo(accessToken, enumList, enumName) {
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
                            console.log(commit.author.login);
                            insertRowInEnumListinser(
                                enumName, 
                                commit.author.login, 
                                obj.repo_name, 
                                obj.file_extension);
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

    await getUsersOfRepo(accessToken,enumList, enumName);

    res.send({enumName, enumList});
})

router.post('/getlists', async (req, res)=>{
    const {user_name}=req.body;
    console.log(user_name);
    con = mysql.createConnection(mysqlConfig);
    con.connect((err)=>{
        if(err) throw err;
        const sql= `select list_name from enumlists where user_name = '${user_name}'`
        con.query(sql, (err, result, fields)=>{
            if(err) throw err;
            console.log(JSON.stringify(result))
            res.send(result);
        })
    })
})

export default router;