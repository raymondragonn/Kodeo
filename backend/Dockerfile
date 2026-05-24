FROM php:8.3-apache

# Instalar extensiones requeridas y Composer
RUN apt-get update && apt-get install -y unzip curl libonig-dev \
    && docker-php-ext-install pdo pdo_mysql mbstring \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
    && rm -rf /var/lib/apt/lists/*

# UTF-8 como charset y encoding por defecto en PHP
RUN echo "default_charset = UTF-8" >> /usr/local/etc/php/php.ini \
    && echo "mbstring.internal_encoding = UTF-8" >> /usr/local/etc/php/php.ini \
    && echo "mbstring.language = neutral" >> /usr/local/etc/php/php.ini

# Habilitar mod_rewrite y mod_headers
RUN a2enmod rewrite headers

# Copiar código
WORKDIR /var/www/html
COPY . .

# Instalar dependencias PHP
RUN composer install --no-dev --optimize-autoloader

# Configurar Apache: permitir .htaccess y exponer headers CORS
RUN echo '<Directory /var/www/html>\n\
    Options -Indexes\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-enabled/kodeo.conf

EXPOSE 80
