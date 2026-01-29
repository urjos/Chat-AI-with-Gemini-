# Chat AI con Gemini

Este proyecto es una aplicación web completa (Full Stack) que integra la inteligencia artificial de Google Gemini para crear un asistente conversacional avanzado. El sistema está estructurado como un monorepo que separa la lógica del servidor y la interfaz de usuario moderna.

## Arquitectura del Proyecto

El proyecto se organiza en dos componentes principales:

### Backend (`/backend`)

Un servidor robusto construido con **Node.js** y **Express** que actúa como intermediario entre el usuario y los servicios de IA.

- **IA Generativa**: Utiliza `@google/generative-ai` para procesar consultas y generar respuestas.
- **Procesamiento de Documentos**: Implementa `multer` para la carga de archivos y `pdf-parse` para extraer texto de PDFs, permitiendo al chat "leer" documentos.
- **Servicios de Voz**: Integra `@google-cloud/speech` para funcionalidades de reconocimiento de voz (Speech-to-Text).
- **Seguridad y Configuración**: Manejo de variables de entorno con `dotenv` y configuración de `cors` para permitir peticiones desde el frontend.

### Frontend (`/frontend`)

Una interfaz de usuario moderna y reactiva construida con herramientas de última generación.

- **Build Tool**: Utiliza **Vite** para un desarrollo rápido y optimizado.
- **Estilos**: Diseño estilizado con **Tailwind CSS** (`@tailwindcss/vite`), permitiendo una UI limpia y responsiva.
- **Interactividad**: Lógica de cliente ligera manejada con **Alpine.js**, ideal para interfaces dinámicas sin la sobrecarga de frameworks más grandes.
- **Iconos**: Incorpora `@fortawesome/fontawesome-free` para elementos visuales.

## Requisitos Previos

- Node.js instalado en el sistema.
- Una API Key válida de Google Gemini (Google AI Studio).
- Credenciales de Google Cloud (si se utilizan las funciones de voz).

## Instalación

1. Clona el repositorio o descarga el código fuente.
2. Abre una terminal en la raíz del proyecto e instala las dependencias (esto instalará paquetes tanto para backend como frontend gracias a los workspaces):

```bash
npm install
```

## Configuración

El proyecto utiliza variables de entorno para la configuración.

1. Crea un archivo llamado `.env` en la raíz del proyecto.
2. Define tus variables de entorno (especialmente la API Key):

```dosini
GEMINI_API_KEY="TU_CLAVE_API_AQUI"
# Agrega otras variables si tu código las requiere
```

## Uso

Para iniciar la aplicación, ejecuta el archivo principal con Node.js:

```bash
node index.js
```

_(Nota: Asegúrate de que `index.js` sea tu archivo de entrada principal. Si usas otro nombre como `app.js` o `server.js`, ajusta el comando anterior)._

## Tecnologías Utilizadas

- **Node.js**
- **Google Gemini API**
- **dotenv**
- **pdf-parse**
