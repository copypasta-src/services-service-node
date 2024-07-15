var AWS = require("aws-sdk");
var uuid = require("uuid");
require('dotenv').config();
const errorHandler = require('../../middleware/errorHandler').errorHandler;
const requestResponseHandler = require('../../middleware/requestResponseHandler').requestResponseHandler;


// TODO this needs to be set at the organizational level?
// Some orgs might use multiple, either way it needs to be a dynamic variable
AWS.config.update({ region: 'us-east-1' });

// TODO Need to find a better way to handle this
const credentials = new AWS.Credentials(process.env.AWS_ACCESS_KEY, process.env.AWS_SECRET_ACCESS_KEY);
AWS.config.credentials = credentials;

exports.createEcrRepository =  async function(req, res) {
    const ecr = new AWS.ECR();
    const params = {
      // TODO remove - just for test
      repositoryName: appRoot,
    };
  
    try {
      const data = await ecr.createRepository(params).promise();
      console.log('Repository created:', data.repository.repositoryUri);
      
      // Send response 
      requestResponseHandler(req, res, { message: 'Repository created', repositoryUri: data.repository.repositoryUri , status :200});

    } catch (err) {
      errorHandler(err, req, res, null, { message: 'Error creating repository', status: 500 });
    }
  }

exports.createAppRunnerService = async function(req, res, serviceName, imageRepositoryUri) {
    const apprunner = new AWS.AppRunner();

    if (req) {
      serviceName = req.body.serviceName;
      imageRepositoryUri = req.body.imageRepositoryUri;
    }
    const params = {
      ServiceName: serviceName,
      SourceConfiguration: {
        // TODO should this be an input param?
        AutoDeploymentsEnabled: true,
        AuthenticationConfiguration: {
            // TODO fill me out
            AccessRoleArn: "arn:aws:iam::123456789012:role/my-ecr-role"
        },
        ImageRepository: {
          ImageIdentifier: imageRepositoryUri,
          ImageRepositoryType: 'ECR',
          ImageConfiguration: {
            Port: '8080', // Change to your application's port if different
          },
        },
      },
      HealthCheckConfiguration : {
        Protocol: "HTTP",
        // TODO double check that you want to use this route for health checks
        "Path": "/status",

      },
      InstanceConfiguration: {
        Cpu: '1024', // Example value, change as needed
        Memory: '2048', // Example value, change as needed
      },
    };
  
    try {
      const data = await apprunner.createService(params).promise();
      console.log('AppRunner service created:', data.Service);
      requestResponseHandler(req, res, { message: 'Service created', service: data.Service , status :200});
      
    } catch (err) {
      errorHandler(err, req, res, null, { message: 'Error creating AppRunner service', status: 500 });
    }
}

exports.createIamRoleForEcrAppRunnerCreation = async function(req, res, roleName, description = 'Role created via SDK') {
  if (req) {
    roleName = req.body.roleName;
    description = req.body.description;
  }
    const iam = new AWS.IAM();
    // TODO AWS wont allow a wildcard resourec unless you are a super user
    const policyDocument = {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Action": [
                  "ecr:GetDownloadUrlForLayer",
                  "ecr:BatchGetImage",
                  "ecr:DescribeImages",
                  "ecr:GetAuthorizationToken",
                  "ecr:BatchCheckLayerAvailability"
              ],
              "Resource": "*"
          }
      ]
  }
    const params = {
        AssumeRolePolicyDocument: JSON.stringify(policyDocument),
        RoleName: roleName,
        Description: description,
      };
    
      try {
        const data = await iam.createRole(params).promise();
        console.log('Role created:', data.Role);

        // Send Response
        requestResponseHandler(req, res, { message: 'Role created', role: data.Role , status :200});
      } catch (err) {
        errorHandler(err, req, res, null, { message: 'Error creating role', status: 500 });
    }
}

module.exports.createNewIamUserForEcrAppRunnerCreation = async function(username = `${appRoot}_ecr-apprunner-user`, roleArn) {

    const iam = new AWS.IAM();

    const params = {
        UserName: username,
      };
    
      try {
        const data = await iam.createUser(params).promise();
        console.log('User created:', data.User);

      // Define the policy to allow assuming and passing the specific role
    const policyDocument = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: 'sts:AssumeRole',
            Resource: roleArn,
          },
          {
            Effect: 'Allow',
            Action: 'iam:PassRole',
            Resource: roleArn,
          },
        ],
      };
  
      // Create the policy
      const policyName = `${username}_AssumeAndPassRolePolicy`;
      const createPolicyParams = {
        PolicyDocument: JSON.stringify(policyDocument),
        PolicyName: policyName,
      };
      const createPolicyData = await iam.createPolicy(createPolicyParams).promise();
      console.log('Policy created:', createPolicyData.Policy);
  
      // Attach the policy to the user
      const attachUserPolicyParams = {
        PolicyArn: createPolicyData.Policy.Arn,
        UserName: username,
      };
      await iam.attachUserPolicy(attachUserPolicyParams).promise();
      console.log('Policy attached to user:', username);

      // Create access keys for the user
      const createAccessKeyParams = {
        UserName: username,
      };
      const createAccessKeyData = await iam.createAccessKey(createAccessKeyParams).promise();
      console.log('Access keys created:', createAccessKeyData.AccessKey);

      // Send Response
      requestResponseHandler(req, res, { message: 'User created', user: data.User , status :200});
  
    //   return createUserData.User;
    } catch (err) {
      errorHandler(err, req, res, null, { message: 'Error creating user', status: 500 });
    }

}




  
 