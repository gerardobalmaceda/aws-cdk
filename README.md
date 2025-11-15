# AWS CDK - IaaS Stack

Proyecto de infraestructura como código (IaC) usando AWS CDK para desplegar un servidor web Apache en AWS EC2.

## Descripción

Este proyecto despliega una infraestructura completa de servidor web Apache sobre Amazon EC2 utilizando AWS Cloud Development Kit (CDK) con TypeScript. La infraestructura incluye:

- **VPC** con múltiples zonas de disponibilidad
- **Security Group** configurado para tráfico web (SSH y HTTP)
- **Instancia EC2** (t2.micro) con Apache HTTP Server pre-instalado
- **Constructs personalizados L3** para mejor reutilización del código

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                         VPC                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │            Subnet Pública (AZ-a)                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  EC2 Instance (Apache Web Server)           │  │  │
│  │  │  - Amazon Linux 2023                        │  │  │
│  │  │  - Apache HTTP Server                       │  │  │
│  │  │  - t2.micro                                 │  │  │
│  │  │  - Public IP                                │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                      ↕                            │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │        Security Group                       │  │  │
│  │  │  - SSH (22) from 0.0.0.0/0                  │  │  │
│  │  │  - HTTP (80) from 0.0.0.0/0                 │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │            Subnet Pública (AZ-b)                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Estructura del Proyecto

```
aws-cdk/
├── bin/
│   └── awscdk.ts                    # Punto de entrada de la aplicación CDK
├── lib/
│   ├── awscdk-stack.ts              # Stack principal (IaasStack)
│   └── constructs/
│       ├── apache-web-server.ts     # Construct L3 para servidor Apache
│       └── web-server-security-group.ts  # Construct L3 para Security Group
├── test/
│   └── awscdk.test.ts               # Tests unitarios
├── cdk.json                         # Configuración de CDK
├── tsconfig.json                    # Configuración de TypeScript
├── package.json                     # Dependencias del proyecto
└── README.md                        # Este archivo
```

### Componentes Principales

#### IaasStack ([lib/awscdk-stack.ts](lib/awscdk-stack.ts))
Stack principal que orquesta todos los recursos de infraestructura:
- Crea la VPC con 2 zonas de disponibilidad
- Instancia el Security Group usando el construct personalizado
- Despliega el servidor web Apache
- Define outputs para acceder a los recursos

#### ApacheWebServer ([lib/constructs/apache-web-server.ts](lib/constructs/apache-web-server.ts))
Construct L3 personalizado que encapsula:
- Creación de instancia EC2
- Script UserData para instalación automática de Apache
- Configuración de logging detallado
- Propiedades públicas para acceder a IP y URL

#### WebServerSecurityGroup ([lib/constructs/web-server-security-group.ts](lib/constructs/web-server-security-group.ts))
Construct L3 personalizado que gestiona:
- Security Group base
- Reglas de ingreso para SSH (puerto 22)
- Reglas de ingreso para HTTP (puerto 80)
- Métodos para agregar reglas personalizadas

## Requisitos Previos

### Software Requerido

1. **Node.js** (versión 18.x o superior)
   ```bash
   node --version  # Debe mostrar v18.x o superior
   ```
   Descargar desde: https://nodejs.org/

2. **npm** (incluido con Node.js)
   ```bash
   npm --version
   ```

3. **AWS CLI** (versión 2.x)
   ```bash
   aws --version
   ```
   Instalación:
   - Windows: https://awscli.amazonaws.com/AWSCLIV2.msi
   - macOS: `brew install awscli`
   - Linux: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

4. **AWS CDK CLI**
   ```bash
   npm install -g aws-cdk
   cdk --version  # Debe mostrar 2.x.x
   ```

5. **TypeScript** (opcional, ya incluido en devDependencies)
   ```bash
   npm install -g typescript
   ```

### Cuenta y Credenciales AWS

1. **Cuenta de AWS activa**
   - Crear cuenta en: https://aws.amazon.com/

2. **Credenciales AWS configuradas**
   ```bash
   aws configure
   ```
   Proporcionar:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (ej: us-east-1)
   - Default output format (json)

   Para verificar:
   ```bash
   aws sts get-caller-identity
   ```

3. **Permisos IAM necesarios**
   El usuario/rol debe tener permisos para:
   - EC2 (crear instancias, VPC, Security Groups)
   - CloudFormation (crear y gestionar stacks)
   - IAM (crear roles para CDK)
   - S3 (para assets de CDK)

### Bootstrap de CDK (Primera vez)

Si es la primera vez que usas CDK en tu cuenta/región:

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

Ejemplo:
```bash
cdk bootstrap aws://123456789012/us-east-1
```

O usando las credenciales por defecto:
```bash
cdk bootstrap
```

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd aws-cdk
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Compilar el proyecto TypeScript**
   ```bash
   npm run build
   ```

4. **Verificar que todo funciona**
   ```bash
   npm test
   ```

## Despliegue

### 1. Sintetizar el CloudFormation Template

Generar el template de CloudFormation para verificar antes de desplegar:

```bash
cdk synth
```

Esto mostrará el template YAML generado. Revisa que los recursos sean correctos.

### 2. Ver diferencias (opcional)

Si ya has desplegado antes, puedes ver qué cambiará:

```bash
cdk diff
```

### 3. Desplegar la infraestructura

```bash
cdk deploy
```

El proceso:
1. Compilará el código TypeScript
2. Sintetizará el template de CloudFormation
3. Creará un changeset
4. Te pedirá confirmación (responde 'y')
5. Desplegará los recursos en AWS

Salida esperada:
```
✅  IaasStack

Outputs:
IaasStack.InstancePublicIP = 54.123.45.67
IaasStack.WebsiteURL = http://54.123.45.67
IaasStack.VpcId = vpc-0a1b2c3d4e5f6g7h8
IaasStack.SecurityGroupId = sg-0a1b2c3d4e5f6g7h8
```

### 4. Verificar el despliegue

Acceder a la URL del servidor web:
```bash
# Usar el output WebsiteURL
curl http://<InstancePublicIP>
```

O abre en el navegador la URL mostrada en `WebsiteURL`.

### 5. Conectarse por SSH (opcional)

```bash
# Obtener la IP del output
ssh -i /path/to/your-key.pem ec2-user@<InstancePublicIP>

# Verificar Apache
sudo systemctl status httpd
```

**Nota**: Necesitas tener configurado un Key Pair en EC2. Si no lo tienes, agrega la propiedad `keyName` en el construct ApacheWebServer.

## Destruir la Infraestructura

Para eliminar todos los recursos creados y evitar costos:

```bash
cdk destroy
```

Confirma con 'y' cuando se solicite. Esto eliminará:
- Instancia EC2
- Security Group
- VPC y subnets
- Todos los recursos asociados

## Comandos Útiles

### Desarrollo

```bash
# Compilar TypeScript a JavaScript
npm run build

# Modo watch (recompila automáticamente al guardar)
npm run watch

# Ejecutar tests unitarios
npm test

# Limpiar archivos compilados
rm -rf *.js *.d.ts lib/**/*.js lib/**/*.d.ts
```

### CDK

```bash
# Listar todos los stacks
cdk list

# Sintetizar template CloudFormation
cdk synth

# Comparar stack desplegado vs código local
cdk diff

# Desplegar stack
cdk deploy

# Desplegar sin confirmación
cdk deploy --require-approval never

# Destruir stack
cdk destroy

# Ver metadata del stack
cdk metadata

# Mostrar documentación
cdk docs
```

### AWS CLI

```bash
# Ver información de la cuenta
aws sts get-caller-identity

# Listar stacks de CloudFormation
aws cloudformation list-stacks

# Describir el stack IaasStack
aws cloudformation describe-stacks --stack-name IaasStack

# Listar instancias EC2
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress]" --output table
```

## Configuración

### Variables de Entorno

El proyecto usa las variables de entorno de AWS CLI por defecto:

```bash
# Verificar configuración
echo $AWS_REGION
echo $AWS_PROFILE
```

Para usar un perfil específico:

```bash
export AWS_PROFILE=mi-perfil
cdk deploy
```

### Modificar la Región

Editar [bin/awscdk.ts](bin/awscdk.ts:12-14):

```typescript
new IaasStack(app, 'IaasStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-west-2'  // Cambiar región aquí
  },
});
```

### Personalizar Instancia EC2

Editar [lib/awscdk-stack.ts](lib/awscdk-stack.ts:76-87):

```typescript
this.webServer = new ApacheWebServer(this, 'ApacheWebServer', {
  vpc: this.vpc,
  securityGroup: this.webSecurityGroup.securityGroup,
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T3,      // Cambiar clase
    ec2.InstanceSize.SMALL     // Cambiar tamaño
  ),
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
  // ... resto de configuración
});
```

### Agregar Reglas de Security Group

```typescript
// En lib/awscdk-stack.ts, después de crear webSecurityGroup
this.webSecurityGroup.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(443),
  'Allow HTTPS traffic'
);
```

## Testing

### Ejecutar Tests

```bash
npm test
```

### Agregar Nuevos Tests

Editar [test/awscdk.test.ts](test/awscdk.test.ts):

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IaasStack } from '../lib/awscdk-stack';

test('VPC Created', () => {
  const app = new cdk.App();
  const stack = new IaasStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::EC2::VPC', 1);
});
```

## Costos Estimados

Recursos desplegados y costos aproximados (región us-east-1):

- **EC2 t2.micro**: ~$8.50/mes (elegible para free tier)
- **VPC**: Gratis
- **NAT Gateway**: ~$32/mes (si se mantiene activo)
- **EBS (8GB)**: ~$0.80/mes
- **Transferencia de datos**: Variable

**Total estimado**: ~$42/mes (sin free tier) o ~$0-10/mes (con free tier)

**Nota**: Destruye la infraestructura cuando no la uses para evitar costos.

## Troubleshooting

### Error: "Cannot find module 'aws-cdk-lib'"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Need to perform AWS calls for account XXX, but no credentials configured"

```bash
aws configure
# O especifica el perfil
export AWS_PROFILE=mi-perfil
```

### Error: "This stack uses assets, so the toolkit stack must be deployed"

```bash
cdk bootstrap
```

### La instancia EC2 no responde en HTTP

1. Espera 2-3 minutos para que se complete el UserData
2. Verifica el Security Group permite puerto 80
3. Revisa logs del UserData:
   ```bash
   ssh ec2-user@<IP>
   sudo cat /var/log/user-data.log
   ```

### Error: "No tienes permisos para hacer esto"

Verifica que tu usuario IAM tiene los permisos necesarios:
- AmazonEC2FullAccess
- IAMFullAccess (para CDK)
- AWSCloudFormationFullAccess
- AmazonS3FullAccess (para assets CDK)

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Recursos Adicionales

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [AWS CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [AWS CDK Examples](https://github.com/aws-samples/aws-cdk-examples)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Apache HTTP Server](https://httpd.apache.org/docs/)

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## Autor

Guido - [GitHub](https://github.com/tuusuario)
