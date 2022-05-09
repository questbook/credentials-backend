import axios from 'axios';

const GetRepos = async (accessToken) => {
    const headers = {Authorization: `Bearer ${accessToken}`};
    return await axios.get('https://api.github.com/user/repos', {headers: headers})
        .then((res)=>res.data)
        .catch((err)=>{
            console.error('Error fetching the repos');
            throw err;
        });
}

export default GetRepos;