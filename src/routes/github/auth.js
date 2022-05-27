import express from 'express';
const router = express.Router()
import lodash from 'lodash';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import querystring from 'querystring';

const {get} = lodash;

const getGithubAccessToken = async (code) => {
    const githubAccessToken = await axios.post(`https://github.com/login/oauth/access_token?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`)
                                .then(res=>res.data)
                                .catch((err)=>{throw err});

    const decoded = querystring.parse(githubAccessToken);
    const accessToken = decoded.access_token;

    return accessToken;
}

router.get('/callback',async (req, res) => {
    const code = get(req, "query.code");
    const path = get(req, "query.path");

    if(!code){
        throw new Error("No code!");
    }
    const accessToken= await getGithubAccessToken(code);
    console.log(accessToken);

    const token = jwt.sign(accessToken, process.env.secret);
    if(path == "/"){
        res.cookie('github-jwt', accessToken, {
            httpOnly: false,
            domain: process.env.DOMAIN,
        });
    }else{
        res.cookie('profile-jwt', token, {
            httpOnly: false,
            domain: process.env.DOMAIN,
        });
    }
    res.redirect(`${process.env.URL}${path}`);
})

export default router;