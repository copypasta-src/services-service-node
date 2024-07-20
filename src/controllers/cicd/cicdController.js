// This will be the controller that handles writing and including any cicd pipeline workflows in the project.
const yaml = require('yamljs');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const errorHandler = require('../../middleware/errorHandler').errorHandler;
const requestResponseHandler = require('../../middleware/requestResponseHandler').requestResponseHandler;


// Dynamically import @octokit/rest
let Octokit;


exports.createGithubActionsWorkflow = async (req, res, configuration = null) => {
    if (!Octokit) {
        const octokitModule = await import('@octokit/rest');
        Octokit = octokitModule.Octokit;
      }
    // Pass the configuration json into the function and we will parse it from there
    if (configuration == null) {
        configuration = req.body.configuration;
    }
    const tempDir = path.join(__dirname, 'temp');


    try {
        // Initialize Octokit
        const octokit = new Octokit({
         auth: configuration.git.token
       });
   
        // TODO this should be dynamic from a database or use a npm hosted package
        const sourceRepoUrl = `https://github.com/${configuration.git.organizationName}/${configuration.meta.projectName}.git`;

        const git = simpleGit();

        // Step 1: Clone the source repository
        await git.clone(sourceRepoUrl, tempDir);

        const repo = simpleGit(tempDir)

        await repo.checkout('development');
   
        // Step 4: Create the .github/workflows directory
        fs.mkdirSync(path.join(tempDir, '.github/workflows'), { recursive: true });

        const filePath = path.join(tempDir, '.github/workflows/github-actions-build-deploy.yml');
        const data = exports.createGithubActionsWorkflowYaml(configuration);
        const yamlContent = yaml.dump(data, { indent: 2 });
        fs.writeFileSync(filePath, yamlContent, 'utf8');

        // Step 5: Set the new remote repository and push
        await repo.add(filePath);
        // Step 6: Commit the changes
        await repo.commit('Created CICDs workflow');
        // Step 7: Push the new branch to the remote repository
        await repo.push('origin', 'development');
        // Step 8: Cleanup the temporary directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        // send response
        requestResponseHandler(req, res,{message: 'Github actions workflow created successfully', status: 200});

} catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });

    errorHandler(error, req, res, null, {message: 'Github actions workflow creation failed', status: 500});
    
} }

exports.createGithubActionsWorkflowYaml = (configuration) => {
    const containerizationProvider = configuration.containerization.containerizationProvider;
    const deploymentProvider = configuration.deployment.deploymentProvider;
    const deploymentModule = configuration.deployment.deploymentProviderConfiguration.deploymentModule;
    const deploymentContainerRepositorty = configuration.deployment.deploymentProviderConfiguration.deploymentContainerRepositorty;

    // Standard Github Actions workflow template
    const yamlJson = {
        "name": "Initialize ECR App Runner and deploy",
        "on": configuration.cicd.trigger,
        "jobs": {
          "deploy": {
            "runs-on": "ubuntu-latest",
            "steps": [
              {
                "name": "Checkout code",
                "uses": "actions/checkout@v2"
              },
            ]
          },
        }
      }

    // If you choose docker, we need to set up Docker Buildx
    if (containerizationProvider == 'docker') {
       yamlJson['jobs']['deploy']['steps'].push( {
            "name": "Set up Docker Buildx",
            "uses": "docker/setup-buildx-action@v2"
          });
    }

    if (deploymentProvider == 'aws') {
        // If you choose AWS for ECR and AppRunner...
        if (deploymentModule == 'AppRunner' && deploymentContainerRepositorty == 'ECR') {

            // Add AWS CLI and configure AWS credentials
            yamlJson['jobs']['deploy']['steps'].push(
                {
                "name": "Configure AWS Credentials",
                "env": {
                  "AWS_ACCESS_KEY_ID": "${{ secrets." + `${configuration.deployment.deploymentProviderConfiguration.aws_access_key_secret_name}` + " }}",
                  "AWS_SECRET_ACCESS_KEY": "${{ secrets." + `${configuration.deployment.deploymentProviderConfiguration.aws_access_secret_key_secret_name}` + " }}",
                  "AWS_DEFAULT_REGION": `${configuration.deployment.deploymentProviderConfiguration.aws_region}`
                },
                "run": "aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID\naws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY\naws configure set region $AWS_DEFAULT_REGION"
              },
              // Assume AWS IAM Role
              {
                "name": "Assume AWS IAM Role",
                "id": "assume-role",
                "run": "ROLE_ARN=\"arn:aws:iam::${{ secrets." + `${configuration.deployment.deploymentProviderConfiguration.aws_account_id_secret_name}`+ " }}:role/${{ secrets." + `${configuration.deployment.deploymentProviderConfiguration.aws_ecr_apprunner_role_secret_name}`+ " }}\"\nSESSION_NAME=\"${{ github.workflow }}-${{ github.run_id }}-${{ github.actor }}\"\nSESSION_NAME=\"${{ github.run_id }}-${{ github.actor }}\"\necho \"Assuming role with ARN: $ROLE_ARN and session name: $SESSION_NAME\"\nCREDENTIALS=$(aws sts assume-role --role-arn \"$ROLE_ARN\" --role-session-name \"$SESSION_NAME\" --output json)\nif [ $? -ne 0 ]; then\necho \"Failed to assume role\"\nexit 1\nfi\necho \"Successfully assumed role\"\nexport AWS_ACCESS_KEY_ID=$(echo \"$CREDENTIALS\" | jq -r \'.Credentials.AccessKeyId\')\nexport AWS_SECRET_ACCESS_KEY=$(echo \"$CREDENTIALS\" | jq -r \'.Credentials.SecretAccessKey\')\nexport AWS_SESSION_TOKEN=$(echo \"$CREDENTIALS\" | jq -r \'.Credentials.SessionToken\')\necho \"AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID\"\necho \"AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY\"\necho \"AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN\""
              },
              // Log in to Amazon ECR
              {
                "name": "Log in to Amazon ECR",
                "id": "login-ecr",
                "env": {
                  "AWS_DEFAULT_REGION": "us-east-1"
                },
                "run": "aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"
              },
              // Check if ECR repository exists
              {
                "name": "Check if ECR repository exists",
                "id": "ecr-check",
                "run": "REPO_NAME=$(basename $GITHUB_REPOSITORY)\naws ecr describe-repositories --repository-names $REPO_NAME || \\\naws ecr create-repository --repository-name $REPO_NAME"
              }
            );

            // If using docker with AWS, build and push Docker image to ECR
            if (containerizationProvider == 'docker') {
                yamlJson['jobs']['deploy']['steps'].push(
                    {
                        "name": "Build and push Docker image to ECR",
                        "run": "REPO_NAME=$(basename $GITHUB_REPOSITORY)\nIMAGE_URI=${{ secrets." + `${configuration.deployment.deploymentProviderConfiguration.aws_account_id_secret_name}`+ " }}.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$REPO_NAME:latest\ndocker build -t $IMAGE_URI .\ndocker push $IMAGE_URI"
                    }
                );
            }
            yamlJson['jobs']['deploy']['steps'].push(
                {
                    "name": "Check if App Runner service exists",
                    "id": "apprunner-check",
                    "run": "SERVICE_NAME=$(basename $GITHUB_REPOSITORY)-runner\naws apprunner list-services --query \"ServiceSummaryList[?ServiceName==\'$SERVICE_NAME\'].ServiceArn\" --output text || echo \"Service does not exist\" > service_check.txt"
                },
                {
                "name": "Create App Runner service if it does not exist",
                "if": "steps.apprunner-check.outputs.service_check == \'Service does not exist\'",
                "run": "SERVICE_NAME=$(basename $GITHUB_REPOSITORY)-service\nIMAGE_URI=${{ secrets." + `${configuration.deployment.deploymentProviderConfiguration.aws_account_id_secret_name}`+ " }}.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$(basename $GITHUB_REPOSITORY):latest\naws apprunner create-service --service-name $SERVICE_NAME --source-configuration \'{\"ImageRepository\":{\"ImageIdentifier\":\"\'$IMAGE_URI\'\",\"ImageConfiguration\":{\"Port\":\"8080\"},\"ImageRepositoryType\":\"ECR\"}, \"AutoDeploymentsEnabled\": true}\' --health-check-configuration \'{\"Protocol\": \"HTTP\", \"Path\": \"/status\"}\'"
                }
            )
        }
    }
    // TODO Add more providers and modules here
    return yamlJson;
}

