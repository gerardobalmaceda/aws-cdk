# Constructs Personalizados - AWS CDK

## ¿Qué es un Construct?

Un **Construct** es el bloque de construcción fundamental de AWS CDK. Representa un componente de infraestructura en la nube que puede ser desde un simple recurso (como una instancia EC2) hasta una arquitectura completa.

### Niveles de Constructs

1. **L1 (CFN Resources)**: Mapeo directo 1:1 con CloudFormation
   - Ejemplo: `CfnInstance`, `CfnBucket`
   - Requieren configuración manual completa
   - Nombres empiezan con `Cfn`

2. **L2 (Curated Constructs)**: Abstracciones con defaults inteligentes
   - Ejemplo: `ec2.Instance`, `s3.Bucket`
   - Los más usados (como en este proyecto)
   - Proveen métodos helper y validaciones

3. **L3 (Patterns)**: Patrones arquitectónicos completos
   - Ejemplo: `ApplicationLoadBalancedFargateService`
   - Despliegan múltiples recursos relacionados

### Anatomía de un Construct

```typescript
new ConstructClass(scope, id, props);
```

- **scope**: El construct padre (usualmente `this` en un Stack)
- **id**: Identificador único dentro del scope
- **props**: Objeto de configuración

## ApacheServer Construct

Este proyecto incluye un **construct personalizado** que encapsula toda la configuración necesaria para desplegar un servidor Apache HTTP.

### Ubicación

`lib/apache-server-construct.ts`

### ¿Qué incluye?

El construct `ApacheServer` crea automáticamente:

- ✅ **Security Group** con reglas de firewall configurables
- ✅ **Instancia EC2** con Amazon Linux 2023
- ✅ **UserData** para instalación y configuración automática de Apache
- ✅ **IAM Role** para la instancia
- ✅ **IP Pública** automáticamente asignada
- ✅ **CloudFormation Outputs** con IP y URL del servidor
- ✅ **Tags** para organización de recursos

### Uso Básico

```typescript
import { ApacheServer } from './apache-server-construct';

// En tu Stack
const vpc = new ec2.Vpc(this, 'MyVpc');

const webServer = new ApacheServer(this, 'WebServer', {
  vpc,
});
```

¡Eso es todo! Con 3 líneas de código tienes un servidor web funcionando.

### Configuración Avanzada

```typescript
const customServer = new ApacheServer(this, 'CustomServer', {
  vpc,

  // Tipo de instancia personalizado
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T3,
    ec2.InstanceSize.SMALL
  ),

  // Puertos permitidos
  allowedPorts: [22, 80, 443, 8080],

  // Descripción del Security Group
  securityGroupDescription: 'Mi servidor personalizado',

  // Contenido HTML personalizado
  customHtmlContent: `
    <!DOCTYPE html>
    <html>
      <head><title>Mi App</title></head>
      <body>
        <h1>Hola desde mi servidor!</h1>
      </body>
    </html>
  `,

  // Comandos adicionales en UserData
  additionalUserDataCommands: [
    'dnf install -y git vim',
    'echo "Herramientas instaladas"',
  ],
});
```

### Propiedades Disponibles

| Propiedad | Tipo | Por Defecto | Descripción |
|-----------|------|-------------|-------------|
| `vpc` | `ec2.IVpc` | **Requerido** | VPC donde se desplegará |
| `instanceType` | `ec2.InstanceType` | `t2.micro` | Tipo de instancia EC2 |
| `allowedPorts` | `number[]` | `[22, 80]` | Puertos permitidos en firewall |
| `securityGroupDescription` | `string` | Auto | Descripción del SG |
| `customHtmlContent` | `string` | Página demo | HTML personalizado |
| `additionalUserDataCommands` | `string[]` | `[]` | Comandos extra en UserData |

### Métodos Públicos

#### `addIngressRule()`

Agrega una regla de ingreso al security group:

```typescript
webServer.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(3000),
  'Permitir Node.js'
);
```

#### `allowFrom()`

Permite acceso desde otro security group:

```typescript
webServer.allowFrom(
  databaseSG,
  ec2.Port.tcp(3306),
  'Permitir MySQL'
);
```

### Propiedades Públicas

Puedes acceder a los recursos creados:

```typescript
const server = new ApacheServer(this, 'Server', { vpc });

// Acceder a la instancia EC2
server.instance.addToRolePolicy(new iam.PolicyStatement({
  actions: ['s3:GetObject'],
  resources: ['arn:aws:s3:::my-bucket/*'],
}));

// Acceder al Security Group
server.securityGroup.addIngressRule(
  ec2.Peer.ipv4('10.0.0.0/16'),
  ec2.Port.tcp(443)
);

// Acceder a la IP pública
console.log(server.publicIp);
```

## Ejemplo Completo

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { ApacheServer } from './apache-server-construct';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 1
    });

    // Servidor Web (Frontend)
    const webServer = new ApacheServer(this, 'WebServer', {
      vpc,
      allowedPorts: [22, 80, 443],
    });

    // Servidor API (Backend)
    const apiServer = new ApacheServer(this, 'ApiServer', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      allowedPorts: [22, 8080],
      customHtmlContent: '<h1>API Server</h1>',
    });

    // Permitir que el Web Server acceda al API Server
    apiServer.allowFrom(
      webServer.securityGroup,
      ec2.Port.tcp(8080),
      'Allow from WebServer'
    );
  }
}
```

## Ventajas de Usar Constructs Personalizados

### 1. **Reutilización**
```typescript
// En lugar de copiar/pegar 50+ líneas cada vez...
const server1 = new ApacheServer(this, 'Server1', { vpc });
const server2 = new ApacheServer(this, 'Server2', { vpc });
const server3 = new ApacheServer(this, 'Server3', { vpc });
```

### 2. **Abstracción**
Oculta la complejidad de configuración, expone solo lo necesario.

### 3. **Mantenibilidad**
Un solo lugar para actualizar la configuración de todos los servidores.

### 4. **Testing**
Más fácil de testear que código duplicado.

### 5. **Documentación**
JSDoc integrado con TypeScript para autocompletado.

## Recursos Generados

El construct `ApacheServer` genera estos recursos en CloudFormation:

```
ApacheServer
├── SecurityGroup (AWS::EC2::SecurityGroup)
│   ├── Ingress Rules (SSH, HTTP, etc.)
│   └── Egress Rules (Allow all)
├── Instance (AWS::EC2::Instance)
│   ├── AMI: Amazon Linux 2023 (latest)
│   ├── UserData: Script de instalación
│   ├── Public IP: Automático
│   └── Tags: Name, ManagedBy, Construct
├── IAM Role (AWS::IAM::Role)
│   └── Instance Profile
└── Outputs (CloudFormation Outputs)
    ├── PublicIP (exportado)
    └── WebURL (exportado)
```

## Cómo Desplegar

```bash
# Compilar TypeScript
npm run build

# Ver cambios
cdk diff

# Desplegar
cdk deploy

# Destruir
cdk destroy
```

## Outputs

Después del deployment, obtendrás:

```
Outputs:
IaasStack.MyApacheServerPublicIPE571F510 = 54.123.45.67
IaasStack.MyApacheServerWebURLD26224B5 = http://54.123.45.67

Exports:
MyApacheServer-PublicIP = 54.123.45.67
MyApacheServer-WebURL = http://54.123.45.67
```

## Próximos Pasos

### Crear más Constructs personalizados

1. **DatabaseServer**: RDS con backups automáticos
2. **LoadBalancedWebServer**: ALB + Auto Scaling Group + Servidores
3. **StaticWebsite**: S3 + CloudFront + Route53

### Ejemplo de estructura:

```
lib/
├── constructs/
│   ├── apache-server-construct.ts
│   ├── database-construct.ts
│   └── load-balancer-construct.ts
└── stacks/
    ├── infrastructure-stack.ts
    └── application-stack.ts
```

## Recursos Adicionales

- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html)
- [Construct Hub](https://constructs.dev/) - Librería de constructs públicos
- [CDK Patterns](https://cdkpatterns.com/) - Patrones arquitectónicos

## Jerarquía en este Proyecto

```
App (CDK Application)
 └── IaasStack (cdk.Stack)
      ├── MyVpc (ec2.Vpc)
      │    ├── Subnets
      │    ├── Route Tables
      │    └── Internet Gateway
      └── MyApacheServer (ApacheServer) ← Tu construct personalizado
           ├── SecurityGroup (ec2.SecurityGroup)
           ├── Instance (ec2.Instance)
           │    ├── IAM Role
           │    └── UserData
           └── Outputs (cdk.CfnOutput x2)
```

Cada nivel del árbol es un **Construct** que puede contener otros constructs.

---

**Creado para el proyecto AWS CDK - IaaS Stack**
