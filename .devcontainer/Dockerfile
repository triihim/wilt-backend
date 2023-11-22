FROM node:18

RUN apt update \
    && apt install -y less man-db sudo \
    && apt-get install vim -y \
    && npm i -g @nestjs/cli

ARG USERNAME=node
RUN echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

ENV DEVCONTAINER=true
