import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { WebServerSecurityGroup } from './constructs/web-server-security-group';
import { ApacheWebServer } from './constructs/apache-web-server';

/**
 * Stack principal para infraestructura IaaS (Infrastructure as a Service)
 *
 * Este stack despliega una infraestructura completa para un servidor web Apache
 * que incluye:
 * - VPC con 2 zonas de disponibilidad
 * - Security Group configurado para tráfico web (SSH y HTTP)
 * - Instancia EC2 con Apache HTTP Server pre-instalado
 * - Outputs con información de acceso al servidor
 *
 * La infraestructura está organizada usando Constructs L3 personalizados
 * para mejor reutilización y mantenimiento del código.
 */
export class IaasStack extends cdk.Stack {
  /**
   * VPC donde se despliega la infraestructura
   */
  public readonly vpc: ec2.Vpc;

  /**
   * Security Group del servidor web
   */
  public readonly webSecurityGroup: WebServerSecurityGroup;

  /**
   * Servidor web Apache
   */
  public readonly webServer: ApacheWebServer;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // Networking: VPC Configuration (L2 Construct)
    // ========================================
    /**
     * Crear VPC con configuración por defecto:
     * - 2 zonas de disponibilidad para alta disponibilidad
     * - Subnets públicas y privadas en cada AZ
     * - NAT Gateway para acceso a internet desde subnets privadas
     */
    this.vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // ========================================
    // Security: Security Group (L3 Custom Construct)
    // ========================================
    /**
     * Crear Security Group usando construct personalizado L3
     * que encapsula las reglas comunes para servidores web
     */
    this.webSecurityGroup = new WebServerSecurityGroup(this, 'WebServerSG', {
      vpc: this.vpc,
      description: 'Security Group para servidor web Apache',
      allowSsh: true,      // Permitir acceso SSH para administración
      allowHttp: true,     // Permitir tráfico HTTP para el servidor web
      allowHttps: false,   // No se requiere HTTPS en esta configuración
      allowAllOutbound: true,
    });

    // ========================================
    // Compute: Apache Web Server (L3 Custom Construct)
    // ========================================
    /**
     * Crear servidor web Apache usando construct personalizado L3
     * que automatiza la instalación y configuración de Apache
     */
    this.webServer = new ApacheWebServer(this, 'ApacheWebServer', {
      vpc: this.vpc,
      securityGroup: this.webSecurityGroup.securityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      subnetType: ec2.SubnetType.PUBLIC,
      associatePublicIpAddress: true,
      enableDetailedLogging: true,
    });

    // ========================================
    // Stack Outputs
    // ========================================
    /**
     * Output con la IP pública de la instancia EC2
     * Útil para conexiones SSH y verificación de despliegue
     */
    new cdk.CfnOutput(this, 'InstancePublicIP', {
      value: this.webServer.publicIp,
      description: 'IP pública de la instancia EC2 con Apache',
      exportName: `${this.stackName}-InstancePublicIP`,
    });

    /**
     * Output con la URL completa del servidor web
     * Permite acceso directo al servidor Apache desde el navegador
     */
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: this.webServer.webUrl,
      description: 'URL del servidor web Apache (HTTP)',
      exportName: `${this.stackName}-WebsiteURL`,
    });

    /**
     * Output con el ID de la VPC
     * Útil para referenciar la VPC desde otros stacks
     */
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'ID de la VPC',
      exportName: `${this.stackName}-VpcId`,
    });

    /**
     * Output con el ID del Security Group
     * Permite reutilizar el Security Group en otros recursos
     */
    new cdk.CfnOutput(this, 'SecurityGroupId', {
      value: this.webSecurityGroup.securityGroup.securityGroupId,
      description: 'ID del Security Group del servidor web',
      exportName: `${this.stackName}-SecurityGroupId`,
    });
  }
}

const app = new cdk.App();
new IaasStack(app, 'IaasStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
