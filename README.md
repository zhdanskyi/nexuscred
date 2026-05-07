# NexusCred | Decentralized Trust Protocol

**NexusCred** es una Single Page Application (SPA) de alto rendimiento diseñada para resolver la crisis de confianza en los entornos de trabajo remotos y descentralizados. El sistema permite a las organizaciones emitir credenciales inmutables (simulación de proofs criptográficos) que los profesionales pueden almacenar, gestionar y auditar en tiempo real a través de una interfaz de alta fidelidad.

---

## 📖 Descripción General

En un mercado laboral globalizado, la verificación de la experiencia y los hitos profesionales suele ser lenta y poco fiable. NexusCred actúa como una capa de confianza entre empresas y freelancers:

* **Emisión Inmutable:** Los registros de trabajo se transforman en credenciales inmutables.
* **Auditoría en Tiempo Real:** Interfaz diseñada para la inspección técnica de procesos y validación de logros.
* **Comunicación Segura:** Sistema de chat integrado con cifrado lógico y actualizaciones en tiempo real bajo un diseño inspirado en Apple Glass.

---

## 🛠️ Stack Tecnológico

El proyecto utiliza tecnologías modernas para garantizar escalabilidad, seguridad y una experiencia de usuario fluida:

* **Frontend:** [Next.js](https://nextjs.org/) (React Framework) con TypeScript.
* **Estilos:** [Tailwind CSS](https://tailwindcss.com/) con implementación de Glassmorphism (Dark Mode).
* **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL) para la gestión de identidades y persistencia.
* **Sincronización:** WebSockets vía Supabase Realtime para mensajería instantánea.

---

## 🗄️ Estructura de la Base de Datos

El esquema relacional ha sido diseñado para mantener la integridad de las credenciales y la privacidad de las comunicaciones:

| Tabla | Descripción |
| :--- | :--- |
| **`profiles`** | Almacena los metadatos de usuario (username, avatar, rol). |
| **`credentials`** | El registro de pruebas de trabajo y validaciones inmutables. |
| **`conversations`** | Define los canales de chat (Privados 1:1 o Grupos). |
| **`chat_members`** | Relación de pertenencia entre usuarios y salas de chat. |
| **`messages`** | Almacenamiento histórico de comunicaciones y estados de lectura. |

---

## 📂 Estructura del Proyecto

```text
nexuscred/
├── components/          # Componentes de UI modulares y reutilizables.
├── lib/                 # Configuración del cliente Supabase y utilidades.
├── pages/               # Routing de la aplicación (Dashboard, Audit, Chat).
├── styles/              # Configuraciones globales de CSS y Tailwind.
├── types/               # Definiciones de tipos para robustez del código.
└── sql/                 # Scripts de migración y configuración de base de datos.





**🔒 Seguridad y Arquitectura
Implementación Actual
Row Level Security (RLS): Cada tabla posee políticas estrictas que impiden el acceso a datos por parte de usuarios no autorizados.

Data Integrity: Uso de llaves foráneas y UUIDs para asegurar la consistencia entre perfiles, conversaciones y mensajes.

Autenticación Real: Gestión de sesiones mediante Supabase Auth con soporte para verificación de correo electrónico.

Roadmap y Perspectivas Futuras
Migración On-Chain: Evolucionar la simulación de credenciales hacia registros reales en redes de Capa 2 (L2).

Zero-Knowledge Proofs (ZKP): Permitir la validación de competencias sin comprometer información corporativa sensible.

Auditoría mediante IA: Integración de modelos para la verificación automática de coherencia en la emisión de credenciales.

Cifrado End-to-End (E2EE): Capa adicional de privacidad para la comunicación entre usuarios.

🚀 Instalación y Despliegue
Para replicar el entorno de desarrollo localmente:

Clonar el repositorio:

Bash
git clone [https://github.com/usuario/nexuscred.git](https://github.com/usuario/nexuscred.git)
Instalar dependencias:

Bash
npm install
Configurar Variables de Entorno:
Crea un archivo .env.local con las claves de tu proyecto Supabase:

Фрагмент коду
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_aqui
Ejecutar el servidor:

Bash
npm run dev
NexusCred Protocol — Transformando la reputación profesional en activos verificables.
