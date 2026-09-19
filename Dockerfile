FROM node:20-alpine

# ആവശ്യമായ ടൂളുകൾ
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    build-base \
    vips-dev \
    fftw-dev \
    gcc \
    g++ \
    make \
    libc6-compat

# yt-dlp ഇൻസ്റ്റാൾ ചെയ്യുന്നു
RUN pip3 install yt-dlp --break-system-packages

WORKDIR /home/container

COPY package*.json ./
# npm install ചെയ്യുമ്പോൾ പ്രശ്നമുണ്ടാക്കുന്ന പാക്കേജുകൾക്ക് വേണ്ടി ഇഗ്നോർ ഓപ്ഷൻ
RUN npm install --ignore-scripts || npm install

COPY . .

CMD ["node", "index.js"]