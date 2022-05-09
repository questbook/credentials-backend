import axios from 'axios';

const GetIssues = async (accessToken) => {
    const headers = {Authorization: `Bearer ${accessToken}`};
    //filter can be one of: assigned, created, mentioned, subscribed, repos, all => for now it's NPM
    return await axios.get('https://api.github.com/issues?filter=all', {headers: headers})
        .then((res)=>res.data)
        .catch((err)=>{
            console.error('Error fetching the issues', err.response);
            return;
        });
}

export default GetIssues;