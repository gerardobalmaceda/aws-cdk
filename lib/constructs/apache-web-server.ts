import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Propiedades para el construct ApacheWebServer
 */
export interface ApacheWebServerProps {
  /**
   * VPC donde se desplegará la instancia EC2
   */
  readonly vpc: ec2.IVpc;

  /**
   * Security Group que se aplicará a la instancia
   */
  readonly securityGroup: ec2.ISecurityGroup;

  /**
   * Tipo de instancia EC2
   * @default t2.micro
   */
  readonly instanceType?: ec2.InstanceType;

  /**
   * Imagen de máquina (AMI) a utilizar
   * @default Amazon Linux 2023 (última versión)
   */
  readonly machineImage?: ec2.IMachineImage;

  /**
   * Tipo de subnet donde desplegar la instancia
   * @default SubnetType.PUBLIC
   */
  readonly subnetType?: ec2.SubnetType;

  /**
   * Asociar una IP pública a la instancia
   * @default true
   */
  readonly associatePublicIpAddress?: boolean;

  /**
   * Habilitar logging detallado del UserData script
   * @default true
   */
  readonly enableDetailedLogging?: boolean;
}

/**
 * Construct L3 que encapsula la configuración completa de un servidor web Apache
 * desplegado en una instancia EC2
 *
 * Este construct automatiza la creación de una instancia EC2 con Apache HTTP Server
 * pre-instalado y configurado, incluyendo:
 * - Instalación automática de Apache mediante UserData
 * - Configuración de arranque automático del servicio
 * - Logging detallado del proceso de instalación
 * - Verificación del estado del servicio
 *
 * @example
 * ```typescript
 * const webServer = new ApacheWebServer(this, 'WebServer', {
 *   vpc: myVpc,
 *   securityGroup: mySecurityGroup,
 *   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
 * });
 *
 * // Acceder a la IP pública
 * console.log(webServer.instance.instancePublicIp);
 * ```
 */
export class ApacheWebServer extends Construct {
  /**
   * La instancia EC2 creada por este construct
   */
  public readonly instance: ec2.Instance;

  constructor(scope: Construct, id: string, props: ApacheWebServerProps) {
    super(scope, id);

    // Crear el UserData script para instalar y configurar Apache
    const userData = this.createApacheUserData(props.enableDetailedLogging ?? true);

    // Crear la instancia EC2 con Apache (Construct L2 de CDK)
    this.instance = new ec2.Instance(this, 'Instance', {
      vpc: props.vpc,
      instanceType: props.instanceType ?? ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: props.machineImage ?? ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: props.securityGroup,
      userData,
      vpcSubnets: {
        subnetType: props.subnetType ?? ec2.SubnetType.PUBLIC,
      },
      associatePublicIpAddress: props.associatePublicIpAddress ?? true,
    });
  }

  /**
   * Crea el script UserData para instalar y configurar Apache HTTP Server
   *
   * El script realiza las siguientes operaciones:
   * 1. Actualiza el sistema operativo
   * 2. Instala Apache HTTP Server
   * 3. Habilita Apache para arranque automático
   * 4. Inicia el servicio Apache
   * 5. Verifica el estado del servicio
   *
   * @param enableLogging - Habilitar logging detallado del proceso
   * @returns UserData configurado para Amazon Linux 2023
   */
  private createApacheUserData(enableLogging: boolean): ec2.UserData {
    const userData = ec2.UserData.forLinux();

    const commands: string[] = ['#!/bin/bash'];

    // Configurar logging detallado si está habilitado
    if (enableLogging) {
      commands.push(
        '# Configurar logging detallado del script UserData',
        'exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1',
        'echo "=== Inicio de UserData Script - Instalación Apache ==="',
        ''
      );
    }

    // Comandos para actualizar el sistema
    commands.push(
      '# Actualizar paquetes del sistema',
      'echo "Actualizando sistema operativo..."',
      'dnf update -y || echo "Update failed, continuing..."',
      ''
    );

    // Comandos para instalar Apache
    commands.push(
      '# Instalar Apache HTTP Server',
      'echo "Instalando Apache HTTP Server..."',
      'dnf install -y httpd',
      ''
    );

    // Comandos para habilitar e iniciar Apache
    commands.push(
      '# Habilitar Apache para arranque automático',
      'echo "Habilitando Apache para inicio automático..."',
      'systemctl enable httpd',
      '',
      '# Iniciar el servicio Apache',
      'echo "Iniciando Apache HTTP Server..."',
      'systemctl start httpd',
      ''
    );

    // Comandos para verificar el estado
    commands.push(
      '# Verificar estado del servicio Apache',
      'echo "Verificando estado de Apache..."',
      'systemctl status httpd --no-pager',
      ''
    );

    if (enableLogging) {
      commands.push('echo "=== UserData Script Completado Exitosamente ==="');
    }

    userData.addCommands(...commands);

    return userData;
  }

  /**
   * Obtiene la dirección IP pública de la instancia
   *
   * @returns IP pública de la instancia EC2
   */
  public get publicIp(): string {
    return this.instance.instancePublicIp;
  }

  /**
   * Obtiene la URL del servidor web Apache
   *
   * @returns URL HTTP del servidor (http://<ip-publica>)
   */
  public get webUrl(): string {
    return `http://${this.instance.instancePublicIp}`;
  }
}
