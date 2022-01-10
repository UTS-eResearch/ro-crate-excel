FROM node:latest


COPY . /app

WORKDIR /app


RUN npm install

RUN npm link

RUN apt-get update && apt-get -y install golang


RUN go get -v github.com/richardlehane/siegfried/cmd/sf


ENV PATH="/root/go/bin:$PATH"

RUN echo $PATH
RUN sf -update

RUN rm -rf /root/go/src
RUN apt-get purge -y golang

RUN mkdir /data

ENTRYPOINT ["/usr/local/bin/rocxl"]

