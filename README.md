# Asistente Virtual de Recepción — v1.0

Plataforma de recepción telefónica inbound con IA basada en [Vapi](https://vapi.ai). Permite crear asistentes virtuales que atienden llamadas entrantes, gestionan incidencias, transfieren llamadas, responden sobre servicios y captan leads.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Base de datos | PostgreSQL + Prisma ORM |
| IA / Telefonía | Vapi (GPT-4o-mini + ElevenLabs) |
| Email | Mailgun |
| Tunnel local | ngrok |

---

## Estructura del proyecto

```
├── back/               # API REST (Express + Prisma)
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/       # vapiService, emailService
│   │   ├── middleware/
│   │   └── utils/
│   └── prisma/
│       └── schema.prisma
├── front/              # Next.js app
│   └── src/app/
│       ├── page.tsx         # Crear agente
│       ├── dashboard/       # Dashboard por agente
│       ├── admin/           # Panel de administración
│       └── phones/          # Gestión de números
└── db_backup/
    ├── v1.0.sql        # Snapshot v1.0
    └── backup.sql      # Backup automático (pre-commit hook)
```

---

## Variables de entorno

Crea `back/.env` con las siguientes variables:

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/asistente_recepcion

# Autenticación
JWT_SECRET=tu-secret-jwt

# Vapi
VAPI_PRIVATE_KEY=tu-vapi-private-key

# Servidor
PORT=3003
NODE_ENV=development

# ngrok (tunnel local)
NGROK_AUTHTOKEN=tu-ngrok-authtoken

# Mailgun
MAILGUN_API_KEY=tu-mailgun-api-key
MAILGUN_DOMAIN=tu-dominio.mailgun.org
MAILGUN_FROM=Nombre <notificaciones@tu-dominio.mailgun.org>
MAILGUN_API_URL=https://api.eu.mailgun.net
```

---

## Instalación y arranque

### Backend
```bash
cd back
npm install
npx prisma db push        # Sincronizar esquema con la BD
npx prisma generate       # Generar cliente Prisma
npm run dev               # Arranca en :3003 + tunnel ngrok automático
```

### Frontend
```bash
cd front
npm install
npm run dev               # Arranca en :3002
```

### Restaurar base de datos desde backup
```bash
psql -U postgres -d asistente_recepcion -f db_backup/v1.0.sql
```

---

## Funcionalidades del asistente

Cada asistente se configura con:

- **Transferencias** — lista de contactos disponibles para transferir llamadas
- **Servicios y productos** — información de la empresa + captación de leads
- **Gestión de incidencias** — recogida de datos + email automático
- **Solicitudes de facturas** — recogida de datos + email automático
- **Instrucciones adicionales** — contexto extra para el agente

---

## Puertos por defecto

| Servicio | Puerto |
|----------|--------|
| Frontend | 3002 |
| Backend | 3003 |
| PostgreSQL | 5432 |

---

## Notas de despliegue

- El backend arranca un tunnel ngrok automáticamente y actualiza el `serverUrl` de todos los asistentes en Vapi.
- El hook `pre-commit` genera un backup de la BD en cada commit (`db_backup/backup.sql`). Si se clona el repo en una nueva máquina, hay que reinstalar el hook desde `.git/hooks/pre-commit`.
- El archivo `.env` **nunca** se sube al repositorio.
