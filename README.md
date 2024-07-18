
# NOTES FOR ZACH
These instructions are indended to reflect the current state of the API as it exists in production. The idea here is that for each component, I can track all the initialization steps required for creating a new microservice on top of that component. As time goes on, I will attempt to improve the API by burning down those lists to be as short as possible (effectively allowing the API to do all the initialization). I will also add new components (deployment options, frameworks, etc) that users can choose to build on.

At the end of applicable steps, I'm going to put in [brackets] where I think the logic should live.

## Use cases
1. Use the `/init/create` endpoint to create a brand new microservice with input parameters
2. Use any of the endpoints shown in the docs (`/docs`) to perform a variety of functions (less common)

## Required Steps before using `/init/create` (organized by component)
 
### GitHub
1. Request the `/github/auth` endpoint to obtain your GitHub token. [User Onboarding]
2. Create an organization in GitHub to house your microservice repositories. [Admin / Organization Decision]

### Express - NONE

### Docker - NONE

### AWS AppRunner + ECR
1. Create an AWS ECR Repository
    - 1.1 Name the repository `{my-repository-name}` (case sensitive) [CICD]
2. Create a new IAM user for deployment (https://us-east-1.console.aws.amazon.com/iam/home?region=us-east-1#/home) [Admin]
    - 2.1 Navigate to IAM -> Users -> Create new User
    - 2.2 Name the user whatever you'd like
    - 2.3 Attach the policy `AmazonEC2ContainerRegistryFullAccess`
    - 2.4 Under "Security Credentials", create a new access key (select the 3rd party service option)
    - 2.5 Copy down your access ID and secret ID for use later


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
        }
    }
}
```
2. You should get a response back saying "Microservice created successfully"

## What do I do after the request?
1. Open your GitHub Repo and add the following repository secrets: [Admin - Orgnaization level secrets]
    - 1.1 `AWS_ACCESS_KEY_ID` = `{key-from-aws-step-2.5}`
    - 1.2 `AWS_SECRET_ACCESS_KEY` = `{secret-id-from-aws-step-2.5}`
2. Clone your GitHub Repo, create a new branch called `development` and perform the following edits: [This API]
    - 2.1 At the root of the project, create `Dockerfile` and paste the following into it

    ```Dockerfile
        # Use an official Node.js runtime as a parent image
        FROM node:18

        WORKDIR /usr/src/app

        # Copy package.json and package-lock.json to the working directory
        COPY package*.json ./

        # Install dependencies
        RUN npm install

        # Copy the rest of the application code to the working directory
        COPY . .

        ENV PORT=8080

        # Expose the application port (adjust if your app uses a different port)
        EXPOSE 8080

        # Define the command to run the application
        CMD ["npm", "start"]
    ```

    - 2.2 At the root of the project, create a the directory `.github/workflows`
    - 2.3 In the directory `.github/workflows`, create a file named `deployToAwsAppRunner.yml` and add the following:

    ```yml
    name: Deploy to AWS App Runner

    on:
    push:
        branches:
        - main
    jobs:
    deploy:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout code
            uses: actions/checkout@v2

        - name: Set up Docker Buildx
            uses: docker/setup-buildx-action@v1

        - name: Configure AWS credentials
            uses: aws-actions/configure-aws-credentials@v1
            with:
            aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
            aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            aws-region: us-east-1 # Change to your AWS region

        - name: Get repository name
            id: repo_name
            run: echo "::set-output name=name::$(basename $(pwd))"
        
        - name: Create ECR repository if it doesn't exist
            run: |
            REPO_NAME=$(echo $GITHUB_REPOSITORY | awk -F / '{print $2}')
            if ! aws ecr describe-repositories --repository-names $REPO_NAME > /dev/null 2>&1; then
                aws ecr create-repository --repository-name $REPO_NAME
            fi

        - name: Log in to Amazon ECR
            id: login-ecr
            uses: aws-actions/amazon-ecr-login@v1

        - name: Build, tag, and push Docker image to Amazon ECR
            env:
            ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
            ECR_REPOSITORY: ${{ steps.repo_name.outputs.name }} # Change to your repository name
            IMAGE_TAG: latest
            run: |
            docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
            docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
    ```
    
3. Commit and push all changed files to the `main` branch
4. Return to GitHub web and confirm that the Actions Workflow from this commit completes successfully
5. Create an AWS AppRunner Service (https://us-east-1.console.aws.amazon.com/apprunner/home?region=us-east-1#/services) [CICD]
    - 5.1 Name the service `{my-repository-name}-runner` (case sensitive)
    - 5.2 Select to use the image just published to your repository
    - 5.3 Select automatic deployment upon new Image upload
    - 5.4 Select to create a new ECR access role
    - 5.5 Set the health check protocol to HTTP and the endpoint `/status`


