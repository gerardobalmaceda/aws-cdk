import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class IaasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc', { maxAzs: 2 });

    // Crear el Key Pair para SSH
    const keyPair = new ec2.KeyPair(this, 'MyKeyPair', {
      keyPairName: 'iaas-demo-keypair',
      type: ec2.KeyPairType.RSA,
      format: ec2.KeyPairFormat.PEM,
    });

    // Guardar la clave privada en Secrets Manager
    const privateKeySecret = new secretsmanager.Secret(this, 'PrivateKeySecret', {
      secretName: 'iaas-demo-private-key',
      description: 'Clave privada para acceso SSH a la instancia EC2',
      secretStringValue: cdk.SecretValue.unsafePlainText(keyPair.privateKey.toString()),
    });

    const sg = new ec2.SecurityGroup(this, 'MySecurityGroup', {
      vpc,
      description: 'Permitir acceso SSH',
      allowAllOutbound: true,
    });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Permitir SSH');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Permitir HTTP');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Permitir HTTPS');

    const instance = new ec2.Instance(this, 'MyInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: sg,
      keyPair: keyPair,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      associatePublicIpAddress: true,
    });

    // Instalar y configurar Nginx automáticamente
    instance.addUserData(
      '#!/bin/bash',
      'set -e',
      '',
      '# Actualizar el sistema',
      'dnf update -y',
      '',
      '# Instalar Nginx',
      'dnf install -y nginx',
      '',
      '# Crear página HTML personalizada',
      'cat > /usr/share/nginx/html/index.html <<EOF',
      '<!DOCTYPE html>',
      '<html lang="es">',
      '<head>',
      '    <meta charset="UTF-8">',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '    <title>Servidor Nginx - AWS CDK</title>',
      '    <style>',
      '        body {',
      '            font-family: Arial, sans-serif;',
      '            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
      '            color: white;',
      '            display: flex;',
      '            justify-content: center;',
      '            align-items: center;',
      '            height: 100vh;',
      '            margin: 0;',
      '        }',
      '        .container {',
      '            text-align: center;',
      '            background: rgba(255, 255, 255, 0.1);',
      '            padding: 40px;',
      '            border-radius: 10px;',
      '            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);',
      '        }',
      '        h1 { margin: 0; font-size: 3em; }',
      '        p { font-size: 1.2em; }',
      '        .badge { background: #4CAF50; padding: 5px 15px; border-radius: 20px; }',
      '    </style>',
      '</head>',
      '<body>',
      '    <div class="container">',
      '        <h1>🚀 Nginx Funcionando!</h1>',
      '        <p><span class="badge">Deployed con AWS CDK</span></p>',
      '        <p>Servidor: Amazon Linux 2023</p>',
      '        <p>Web Server: Nginx</p>',
      '    </div>',
      '</body>',
      '</html>',
      'EOF',
      '',
      '# Iniciar y habilitar Nginx',
      'systemctl start nginx',
      'systemctl enable nginx',
      '',
      '# Verificar estado',
      'systemctl status nginx --no-pager'
    );

    // Outputs
    new cdk.CfnOutput(this, 'InstancePublicIP', {
      value: instance.instancePublicIp,
      description: 'IP pública de la instancia EC2',
    });

    new cdk.CfnOutput(this, 'KeyPairName', {
      value: keyPair.keyPairName,
      description: 'Nombre del Key Pair',
    });

    new cdk.CfnOutput(this, 'PrivateKeySecretArn', {
      value: privateKeySecret.secretArn,
      description: 'ARN del secreto que contiene la clave privada',
    });

    new cdk.CfnOutput(this, 'SSHCommand', {
      value: `aws secretsmanager get-secret-value --secret-id ${privateKeySecret.secretName} --query SecretString --output text > keypair.pem && chmod 400 keypair.pem && ssh -i keypair.pem ec2-user@${instance.instancePublicIp}`,
      description: 'Comando para conectarse por SSH',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `http://${instance.instancePublicIp}`,
      description: 'URL del servidor web Nginx',
    });
  }
}

const app = new cdk.App();
new IaasStack(app, 'IaasDemoStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
