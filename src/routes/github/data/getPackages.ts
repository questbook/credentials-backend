import axios from 'axios';

const GetPackages = async (accessToken) => {
    const headers = {Authorization: `Bearer ${accessToken}`};
    //package type can be one of: npm, maven, rubygems, docker, nuget, container => for now it's NPM
    return await axios.get('https://api.github.com/user/packages?package_type=npm', {headers: headers})
        .then((res)=>res.data)
        .catch((err)=>{
            // console.error('Error fetching the packages', err);
            throw err;
        });
}

export default GetPackages;