import axios from 'axios';

const GetUser = async (accessToken) => {
    const headers = {Authorization: `Bearer ${accessToken}`};
    return await axios.get("https://api.github.com/user", {headers: headers})
        .then((res)=>res.data)
        .catch((err)=>{
            console.error('Error fetching the user from github');
            throw err;
        });
}

export default GetUser;