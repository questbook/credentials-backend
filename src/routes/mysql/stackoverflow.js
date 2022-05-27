import express from 'express';
const router = express.Router()
import mysql from 'mysql2/promise';
import axios from 'axios';
import GetUser from '../github/data/getUser.js';

let con = null;

const mysqlConfig ={
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
}

async function createListsTable (){
    let respone = {}
    try{
        con = await mysql.createConnection(mysqlConfig);
        await con.connect();
        const sql = `
            CREATE TABLE IF NOT EXISTS lists(
                list_id VARCHAR(200) NOT NULL,
                username TEXT,
                reputation INT,
                badge_name TEXT,
                badge_rank TEXT,
                erc721_address TEXT,
                erc721_name TEXT,
                repository TEXT,
                file_extension TEXT,
                source TEXT NOT NULL,
                list_created_by TEXT NOT NULL,
                list_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=INNODB;
            `;
        const result = await con.query(sql);
        respone['result'] = result;
    }catch(err){
        respone['error'] = err.message;
    }
    return respone;
}

async function storeRecipientsInDb(listName, recipients, listcreator){
    let response = {};

    const tableResult = await createListsTable();

    if(tableResult.error){
        console.log('storeRecipientsInDb', tableResult.error);
        return tableResult;
    }

    Promise.all(
        recipients.map(async (recipient)=>{
            const{name, rank, user} = recipient;
            const {user_id, reputation} = user;

            try{
                await con.connect();
                const sql = `INSERT INTO lists (list_id, username, reputation, badge_name, badge_rank, source, list_created_by)
                                    VALUES ('${listName}', '${user_id}', '${reputation}','${name}','${rank}', 'stackoverflow', '${listcreator}')`
                const result = await con.query(sql);
                response['result'] = result;
            }catch(err){
                console.log(err.message);
                response['error'] = err.message;
            }
        })
    )

    console.log('storeRecipientsInDb', response);
    return response;
    
}

function deconstructQuery(query){
    const rank_regex = /rank EQUALS\s*"(.*?)"/ig
    const language_regex = /language IN\s*\((.*?)\)/ig
    const each_language_regex = /"(.*?)"/g

    const rank_query = query.match(rank_regex);
    const ranks = rank_query[0].match(each_language_regex);

    const languages_query = query.match(language_regex);
    const languages = languages_query[0].match(each_language_regex);

    let queryLists = [];
    languages.map((language)=>{
        const obj = {}
        obj['language'] = language.replaceAll('"','');
        obj['rank'] = ranks[0].replaceAll('"','');
        queryLists.push(obj);
    });
    return queryLists;
}

async function getBadgeId(queryLists){
    let badgeIds = [];

    await Promise.all (queryLists.map(async (query)=>{
        const response = await axios.get(`https://api.stackexchange.com/2.3/badges/tags?order=desc&max=${query.rank.toLowerCase()}&sort=rank&inname=${query.language.toLowerCase()}&site=stackoverflow`);
        response.data?.items.map(async (badge,i)=>{
            if(badge.name.toLowerCase()==query.language.toLowerCase()){
                let obj = {}
                obj['language'] = query.language.toLowerCase();
                obj['rank'] = query.rank.toLowerCase();
                obj['badge_id'] = badge.badge_id
                badgeIds.push(obj);
            }
        })
    }))

    return badgeIds;
}

function paginated_fetch(
    url = is_required("url"), 
    page = 1,
    previousResponse = []
  ) {
    return axios.get(`${url}&page=${page}`) 
      .then(response => response.data)
      .then(newResponse => {
        const response = [...previousResponse, ...newResponse.items];
  
        if (newResponse.has_more) {
          page++;
  
          return paginated_fetch(url, page, response);
        }
  
        return response;
      })
      .catch(err=> console.log(err));
  }

async function getRecipientsOfBadges(badgeIds){
    let ids = [];
    badgeIds.map((badge)=>ids.push(badge.badge_id));
    console.log(ids.join(';'));

    const response = paginated_fetch(`https://api.stackexchange.com/2.3/badges/${ids.join(';')}/recipients?site=stackoverflow&key=${process.env.STACKOVERFLOW_KEY}`)

    return response;
}



router.post('/create', async (req, res)=>{
    const{enumName, stackoverflowQuery} = req.body;
    const accessToken = req.headers.authorization;

    const queryLists = deconstructQuery(stackoverflowQuery);

    const badgeIds = await getBadgeId(queryLists); 
    
    const recipients = await getRecipientsOfBadges(badgeIds);
    
    const listCreator = await GetUser(accessToken);

    const result = await storeRecipientsInDb(enumName, recipients, listCreator?.login);

    res.send({recipients, result});
})

export default router;