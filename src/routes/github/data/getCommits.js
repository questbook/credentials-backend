import axios from 'axios';

const GetCommits = async (accessToken, repo, userData) => {
    const headers = {Authorization: `Bearer ${accessToken}`};
    return await axios.get(`https://api.github.com/repos/${repo.full_name}/commits?author=${userData.email}`, {headers: headers})
    .then(async (res)=>{
        const repo_commit ={};
        if(res.data.length>0){
            const allCommits = res.data;
            return Promise.all(allCommits.map(async (commit, i)=>{
                const commit_files_data = await axios.get(`https://api.github.com/repos/${repo.full_name}/commits/${commit.sha}`, {headers: headers})
                                            .then((res)=>res.data);
                const changed_files_data = commit_files_data?.files;
                delete commit_files_data.files;

                const cleanedFileData = changed_files_data.map((file,i)=>{
                    const changedFile = {
                        filename: file.filename,
                        metadata: file,
                        language: file.filename?.split('.').length>0?file.filename?.split('.')[1]:null,
                    }
                    return changedFile;
                })
                const cleanCommitData = {
                    commit_sha: commit_files_data?.sha,
                    metadata : commit_files_data,
                    files: cleanedFileData,
                }
                return commit_files_data;
            })).then((allcommitfiles)=>{
                repo_commit[repo.full_name] = {
                    commits: allcommitfiles,
                };
                return repo_commit;
            });   
        }else{
            repo_commit[repo.full_name] = {
                commits: res.data,
            };
            return repo_commit;
        }
        
    }).catch((err)=>{
        const repo_commit ={};
        repo_commit[repo.full_name] = "Error fetching commit";
        return repo_commit;
    });
}

export default GetCommits;