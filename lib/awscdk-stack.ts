import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { ApacheServer } from './apache-server-construct';

export class IaasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Crear VPC
    const vpc = new ec2.Vpc(this, 'MyVpc', { maxAzs: 2 });

    // Opción 1: Usar el construct con configuración por defecto
    // Solo necesitas la VPC!
    const webServer = new ApacheServer(this, 'MyApacheServer', {
      vpc,
    });

    // Opción 2: Ejemplo con configuración personalizada
    // Descomenta este bloque para crear un segundo servidor con config custom
    /*
    const customServer = new ApacheServer(this, 'CustomApacheServer', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      allowedPorts: [22, 80, 443, 8080],
      securityGroupDescription: 'Security group para servidor personalizado',
      customHtmlContent: `
        <!DOCTYPE html>
        <html>
        <head><title>Mi Servidor Custom</title></head>
        <body>
          <h1>Este es mi servidor personalizado!</h1>
          <p>Configurado con el construct ApacheServer</p>
        </body>
        </html>
      `,
      additionalUserDataCommands: [
        '# Instalar utilidades adicionales',
        'dnf install -y git vim',
        'echo "Utilidades adicionales instaladas"',
      ],
    });

    // Agregar regla adicional al servidor custom
    customServer.addIngressRule(
      ec2.Peer.ipv4('10.0.0.0/16'),
      ec2.Port.tcp(3306),
      'Permitir MySQL desde VPC'
    );
    */
  }
}

const app = new cdk.App();
new IaasStack(app, 'IaasStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
