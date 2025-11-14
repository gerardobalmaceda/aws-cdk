import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Props para configurar el servidor Apache
 */
export interface ApacheServerProps {
  /**
   * VPC donde se desplegará la instancia
   */
  vpc: ec2.IVpc;

  /**
   * Tipo de instancia EC2
   * @default t2.micro
   */
  instanceType?: ec2.InstanceType;

  /**
   * Puertos que se permitirán en el security group
   * @default [22, 80]
   */
  allowedPorts?: number[];

  /**
   * Descripción del security group
   * @default 'Security group for Apache server'
   */
  securityGroupDescription?: string;

  /**
   * Contenido HTML personalizado para el index.html
   * @default Una página de bienvenida básica
   */
  customHtmlContent?: string;

  /**
   * Comandos adicionales para ejecutar en el UserData
   * @default []
   */
  additionalUserDataCommands?: string[];
}

/**
 * Construct personalizado que crea un servidor Apache HTTP Server
 * en una instancia EC2 con toda la configuración necesaria.
 *
 * Este construct encapsula:
 * - Security Group con reglas de ingreso configurables
 * - Instancia EC2 con Amazon Linux 2023
 * - UserData para instalar y configurar Apache
 * - Outputs de CloudFormation con IP y URL
 *
 * @example
 * ```typescript
 * const vpc = new ec2.Vpc(this, 'VPC');
 * const server = new ApacheServer(this, 'WebServer', {
 *   vpc,
 *   allowedPorts: [22, 80, 443]
 * });
 * ```
 */
export class ApacheServer extends Construct {
  /**
   * La instancia EC2 creada
   */
  public readonly instance: ec2.Instance;

  /**
   * El security group asociado a la instancia
   */
  public readonly securityGroup: ec2.SecurityGroup;

  /**
   * IP pública de la instancia
   */
  public readonly publicIp: string;

  constructor(scope: Construct, id: string, props: ApacheServerProps) {
    super(scope, id);

    // Crear Security Group
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: props.securityGroupDescription || 'Security group for Apache server',
      allowAllOutbound: true,
    });

    // Configurar reglas de ingreso
    const ports = props.allowedPorts || [22, 80];
    ports.forEach(port => {
      const portName = this.getPortName(port);
      this.securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(port),
        `Permitir ${portName}`
      );
    });

    // Configurar UserData
    const userData = ec2.UserData.forLinux();

    // Comandos base para instalar Apache
    const baseCommands = [
      '#!/bin/bash',
      'exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1',
      'echo "=== Inicio de UserData Script ==="',
      '',
      '# Actualizar sistema',
      'dnf update -y || echo "Update failed, continuing..."',
      '',
      '# Instalar Apache',
      'echo "Instalando Apache HTTP Server..."',
      'dnf install -y httpd',
      '',
      '# Crear contenido HTML personalizado',
    ];

    // Contenido HTML personalizado o por defecto
    const htmlContent = props.customHtmlContent || `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apache Server - AWS CDK</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 30px;
            backdrop-filter: blur(10px);
        }
        h1 { margin-top: 0; }
        .info { background: rgba(0, 0, 0, 0.2); padding: 15px; border-radius: 5px; margin: 15px 0; }
        code { background: rgba(0, 0, 0, 0.3); padding: 2px 6px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Servidor Apache Funcionando!</h1>
        <p>Este servidor fue desplegado usando <strong>AWS CDK</strong> con un <strong>Construct personalizado</strong>.</p>

        <div class="info">
            <h3>📦 Información del Construct:</h3>
            <ul>
                <li><strong>ID:</strong> ${id}</li>
                <li><strong>Sistema:</strong> Amazon Linux 2023</li>
                <li><strong>Servidor Web:</strong> Apache HTTP Server</li>
                <li><strong>Puertos permitidos:</strong> ${ports.join(', ')}</li>
            </ul>
        </div>

        <div class="info">
            <h3>✅ Características:</h3>
            <ul>
                <li>Instancia EC2 configurada automáticamente</li>
                <li>Security Group con reglas de firewall</li>
                <li>UserData para instalación desatendida</li>
                <li>IP pública asignada</li>
            </ul>
        </div>

        <p><em>Construct creado como parte del proyecto AWS CDK</em></p>
    </div>
</body>
</html>
    `.trim();

    const htmlCommands = [
      `cat > /var/www/html/index.html <<'EOF'`,
      htmlContent,
      'EOF',
      '',
      '# Configurar permisos',
      'chown apache:apache /var/www/html/index.html',
      'chmod 644 /var/www/html/index.html',
      '',
    ];

    // Comandos para habilitar e iniciar Apache
    const serviceCommands = [
      '# Habilitar e iniciar Apache',
      'echo "Iniciando Apache..."',
      'systemctl enable httpd',
      'systemctl start httpd',
      '',
      '# Verificar estado',
      'systemctl status httpd --no-pager',
      '',
    ];

    // Comandos adicionales del usuario
    const additionalCommands = props.additionalUserDataCommands || [];

    // Finalización
    const finalizationCommands = [
      'echo "=== UserData Script Completado ==="',
    ];

    // Combinar todos los comandos
    userData.addCommands(
      ...baseCommands,
      ...htmlCommands,
      ...serviceCommands,
      ...additionalCommands,
      ...finalizationCommands
    );

    // Crear instancia EC2
    this.instance = new ec2.Instance(this, 'Instance', {
      vpc: props.vpc,
      instanceType: props.instanceType || ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: this.securityGroup,
      userData,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      associatePublicIpAddress: true,
    });

    // Guardar IP pública
    this.publicIp = this.instance.instancePublicIp;

    // Crear Outputs de CloudFormation
    new cdk.CfnOutput(this, 'PublicIP', {
      value: this.publicIp,
      description: `IP pública del servidor ${id}`,
      exportName: `${id}-PublicIP`,
    });

    new cdk.CfnOutput(this, 'WebURL', {
      value: `http://${this.publicIp}`,
      description: `URL del servidor Apache ${id}`,
      exportName: `${id}-WebURL`,
    });

    // Tags para la instancia
    cdk.Tags.of(this.instance).add('Name', `${id}-ApacheServer`);
    cdk.Tags.of(this.instance).add('ManagedBy', 'AWS-CDK');
    cdk.Tags.of(this.instance).add('Construct', 'ApacheServer');
  }

  /**
   * Método helper para obtener el nombre del puerto
   */
  private getPortName(port: number): string {
    const portNames: { [key: number]: string } = {
      22: 'SSH',
      80: 'HTTP',
      443: 'HTTPS',
      8080: 'HTTP Alternativo',
      3000: 'Node.js',
      3306: 'MySQL',
      5432: 'PostgreSQL',
    };
    return portNames[port] || `Puerto ${port}`;
  }

  /**
   * Agrega una regla de ingreso adicional al security group
   */
  public addIngressRule(peer: ec2.IPeer, port: ec2.Port, description: string): void {
    this.securityGroup.addIngressRule(peer, port, description);
  }

  /**
   * Permite el acceso desde otro security group
   */
  public allowFrom(source: ec2.ISecurityGroup, port: ec2.Port, description?: string): void {
    this.securityGroup.addIngressRule(
      source,
      port,
      description || 'Allow from security group'
    );
  }
}
