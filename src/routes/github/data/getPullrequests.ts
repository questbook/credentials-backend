import axios from 'axios';

const GetPullrequests = async (accessToken, repo, userData) => {
    const headers = {Authorization: `Bearer ${accessToken}`};
    return await axios.get(`https://api.github.com/repos/${userData.login}/${repo.full_name}/pulls`, {headers: headers})
        .then((res)=>{console.log(res.data); return;})
        .catch((err)=>{
            console.error('Error fetching the pull requests', err.response.data);
            const repo_commit ={};
            repo_commit[repo.full_name] = "No pull request found";
            return repo_commit;
        });
}

export default GetPullrequests;