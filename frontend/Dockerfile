FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_JITSI_EXTRA_HOSTS=
ENV VITE_JITSI_EXTRA_HOSTS=$VITE_JITSI_EXTRA_HOSTS
ARG VITE_JITSI_ALLOW_LOCALHOST=
ENV VITE_JITSI_ALLOW_LOCALHOST=$VITE_JITSI_ALLOW_LOCALHOST
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
