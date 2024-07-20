
# NOTES FOR ZACH
These instructions are indended to reflect the current state of the API as it exists in production. The idea here is that for each component, I can track all the initialization steps required for creating a new microservice on top of that component. As time goes on, I will attempt to improve the API by burning down those lists to be as short as possible (effectively allowing the API to do all the initialization). I will also add new components (deployment options, frameworks, etc) that users can choose to build on.

At the end of applicable steps, I'm going to put in [brackets] where I think the logic should live.

## Use cases
1. Use the `/init/create` endpoint to create a brand new microservice with input parameters
2. Use any of the endpoints shown in the docs (`/docs`) to perform a variety of functions (less common)

## Required Steps before using `/init/create` (organized by component)

### Express - NONE

### Docker - NONE

### AWS AppRunner + ECR
1. Create IAM Policy, User, and Role using the following instructions : https://zachmtucker.atlassian.net/wiki/spaces/SD/pages/5636139/Onboarding+Checklists
    - 1.1 save credentials for the user created
    - 1.2 save name of IAM role created

### GitHub
1. Request the `/github/auth` endpoint to obtain your GitHub token. [User Onboarding]
2. Create an organization in GitHub to house your microservice repositories. [Admin / Organization Decision]
3. Create the following organization level secrets
    - 3.1 `AWS_${organization_name}_USER_ACCESS_KEY` = Key from AWS step 1.1
    - 3.2 `AWS_${organization_name}_USER_SECRET_ACCESS_KEY` = Secret Key from AWS step 1.1
    - 3.3 `AWS_ACCOUNT_ID` = AWS root account ID
    - 3.4 `AWS_ECR_APPRUNNER_ROLE` = Role name from AWS step 1.2

## How to use `init/create`
1. Using postman or your favorite HTTP request script, make a request to `https://k9mczp7fse.us-east-1.awsapprunner.com/init/create` with the following body: [Frontend]

```json
{
        "configuration" : {
        "meta" : {
            "name" : "{Project Name Pretty}",
            "description" : "{Description}",
            "projectName" : "{project-name-lowercase-hyphenated}"
        },
        "framework": { 
            "framework": "express"
        },
        "git" : { 
            "gitProvider" : "github",
            "organizationName" : "{github-organization-name}",
            "token" : "{token-from-step-1-under-github}"
        },
        "cicd": { // optional
            "cicdProvider" : "githubActions" ,
            "trigger": {
                "pull_request": {
                  "types": ["closed"],
                  "branches": ["main"]
                }
              }
        },
        "containerization" : { // optional
            "containerizationProvider" : "docker"
        },
        "deployment" : { // optional
            "deploymentProvider" : "aws",
            "deploymentProviderConfiguration" : {
                // This is all just provider specific stuff. Examples for AWS shown.
                "deploymentModule" : "AppRunner",
                "deploymentContainerRepositorty" : "ECR",
                "autoDeploy" : true,
                "aws_access_key_secret_name" : "AWS_OPERA_MICROSERVICE_USER_ACCESS_KEY", // This is the repository secret variable name
                "aws_access_secret_key_secret_name" : "AWS_OPERA_MICROSERVICE_USER_SECRET_ACCESS_KEY", // This is the repository secret variable name
                "aws_account_id_secret_name" : "AWS_ACCOUNT_ID", // This is the repository secret variable name
                "aws_region" : "us-east-1",
                "aws_ecr_apprunner_role_secret_name" : "AWS_ECR_APPRUNNER_ROLE"
            } 
        }
    }
}
```
2. You should get a response back saying "Microservice created successfully"

## What do I do after the request?
1. Commit and push all changed files to the `main` branch
2. Return to GitHub web and confirm that the Actions Workflow from this commit completes successfully



