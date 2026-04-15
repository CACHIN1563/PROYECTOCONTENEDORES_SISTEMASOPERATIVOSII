FROM node:18-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos solo el package.json primero para aprovechar el caché de capas de Docker
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto de la aplicación
EXPOSE 3000

# Comando para correr la API
CMD ["npm", "start"]
