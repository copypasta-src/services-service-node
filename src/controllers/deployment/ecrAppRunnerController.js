var AWS = require("aws-sdk");
var uuid = require("uuid");

// TODO this needs to be set at the organizational level?
// Some orgs might use multiple, either way it needs to be a dynamic variable
AWS.config.update({ region: 'us-east-1' });

// TODO still need to handle auth

module.exports.createEcrRepository =  async function() {
    const ecr = new AWS.ECR();
    const params = {
      appRoot,
    };
  
    try {
      const data = await ecr.createRepository(params).promise();
      console.log('Repository created:', data.repository.repositoryUri);
      return data.repository.repositoryUri;
    } catch (err) {
      console.error('Error creating repository:', err);
      throw err;
    }
  }

module.exports.createAppRunnerService = async function (serviceName, imageRepositoryUri) {
    const apprunner = new AWS.AppRunner();
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
      return data.Service;
    } catch (err) {
      console.error('Error creating AppRunner service:', err);
      throw err;
    }
}

module.exports.createIamRoleForEcrAppRunnerCreation = async function(roleName, description = 'Role created via SDK') {
    const iam = new AWS.IAM();
    // TODO need to verify this policy document is sufficient
    const policyDocument = {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: 'Allow',
                Principal: {
                  AWS: [
                    'arn:aws:iam::123456789012:root', // TODO Replace with the AWS account ID you trust
                  ],
                },
                Action: 'sts:AssumeRole',
              },
            {
                Effect: "Allow",
                Action: [
                    "ecr:GetDownloadUrlForLayer",
                    "ecr:BatchGetImage",
                    "ecr:DescribeImages",
                    "ecr:GetAuthorizationToken",
                    "ecr:BatchCheckLayerAvailability",
                    'sts:AssumeRole',
                    "apprunner:CreateService",
                    "apprunner:DescribeService",
                    "apprunner:StartDeployment"
                ],
                Resource: "*"
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
        return data.Role;
      } catch (err) {
        console.error('Error creating role:', err);
        throw err;
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
  
    //   return createUserData.User;
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }

}




  
 