import express from 'express';
const router = express.Router()
import mysql from 'mysql2';
import axios from 'axios';
import GetUser from '../github/data/getUser.js';
import Web3 from 'web3';

let con = null;

const mysqlConfig ={
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
}

function createProfileTable (){
    con = mysql.createConnection(mysqlConfig);
    con.connect( (err)=>{
        if(err) throw err;
        console.log('connected');

        const sql = `
        CREATE TABLE IF NOT EXISTS profile(
            username varchar(50) NOT NULL PRIMARY KEY,
            wallet_address TEXT NOT NULL,
            signature_proof TEXT NOT NULL,
            profile_claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=INNODB;
        `;
        con.query(sql, (err, result)=>{
            if(err) throw err;
            console.log(`profile table created`);
        });
    })
    
}

router.get('/get-user', async (req,res) => {
    const accessToken = req.headers.authorization;
    const user = await GetUser(accessToken);
    res.send(user);
})

router.get('/claim-github/:signature', async (req, res) => {
    const {signature} = req.params;
    const accessToken = req.headers.authorization;

    const user = await GetUser(accessToken);

    const w3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_PROVIDER_URL));
    const hashAccessToken = w3.utils.sha3(accessToken);
    const wallet_address = w3.eth.accounts.recover(hashAccessToken, signature, true);

    const signature_proof =  w3.eth.accounts.sign(`${user?.login}:${wallet_address}`, process.env.PRIVATE_KEY);

    await createProfileTable();

    con.connect(async (err)=>{
        if(err) throw err;
        const sql = `INSERT INTO profile (username, wallet_address, signature_proof)
                        VALUES ('${user?.login}', '${wallet_address}', '${signature_proof.signature}')`
        con.query(sql, (error, result)=>{
            if(error) {
                if(error.sqlMessage.includes('Duplicate entry')){
                    res.send('profile already claimed!');
                }
            }else{
                res.send('profile claimed!');
            }
        });
    })
})

export default router;