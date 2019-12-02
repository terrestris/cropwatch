FROM terrestris/geoserver

WORKDIR $GEOSERVER_LIB_DIR

RUN apk -U upgrade --update
RUN apk add curl

RUN curl -jkSL -o geoserver-$GEOSERVER_VERSION-importer-plugin.zip http://sourceforge.net/projects/geoserver/files/GeoServer/$GEOSERVER_VERSION/extensions/geoserver-$GEOSERVER_VERSION-importer-plugin.zip
RUN unzip -o geoserver-$GEOSERVER_VERSION-importer-plugin.zip
RUN rm geoserver-$GEOSERVER_VERSION-importer-plugin.zip

RUN apk del curl && rm -rf /tmp/* /var/cache/apk/*
