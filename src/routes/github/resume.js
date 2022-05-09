import express from 'express'
import GetCommits from './data/getCommits';
import GetIssues from './data/getIssues';
import GetPackages from './data/getPackages';
import GetPullrequests from './data/getPullrequests';
import GetRepos from './data/getRepos';
import GetUser from './data/getUser';
const router = express.Router()

router.get('/',async (req, res) => {

    const accessToken = req.headers.authorization;

    const userData = await GetUser(accessToken);
    const repos = await GetRepos(accessToken);
    const allCommits = await Promise.all(repos.map(async (repo,i )=> {
            const commits = await GetCommits(accessToken,repo,userData);
            return commits;
        }));
    const packages = await GetPackages(accessToken);

    const allPullrequests = await Promise.all(repos.map(async (repo,i )=> {
        const pullrequests = await GetPullrequests(accessToken,repo,userData);
        return pullrequests;
    }));

    const issues = await GetIssues(accessToken);

    res.send({userData, repos, allCommits, packages, allPullrequests, issues});
})

export default router;