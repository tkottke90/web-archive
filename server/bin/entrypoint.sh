#! /bin/bash

npx prisma migrate deploy

exec node index.js