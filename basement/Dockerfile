FROM ubuntu:16.04
WORKDIR ~
RUN dpkg --add-architecture i386
RUN apt-get update
RUN apt-get install software-properties-common -y --fix-missing
RUN apt-get install apt-transport-https -y
RUN apt-get install wget -y
RUN wget -nc https://dl.winehq.org/wine-builds/Release.key
RUN apt-key add Release.key
RUN apt-add-repository https://dl.winehq.org/wine-builds/ubuntu/
RUN apt-get update
RUN apt-get install --install-recommends winehq-stable -y --fix-missing
USER lurebot
LABEL maintainer="esphas@hotmail.com"
LABEL version="1.0"
LABEL description="The base image for Lurebot"
