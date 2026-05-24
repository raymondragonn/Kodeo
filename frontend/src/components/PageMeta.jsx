import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://bykodeo.com';
const OG_IMAGE = `${BASE_URL}/og-image.png`;

export default function PageMeta({ title, description, path = '' }) {
  const url = `${BASE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title"       content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type"        content="website" />
      <meta property="og:url"         content={url} />
      <meta property="og:image"       content={OG_IMAGE} />
      <meta property="og:site_name"   content="Kodeo" />
      <meta property="og:locale"      content="es_MX" />
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={OG_IMAGE} />
    </Helmet>
  );
}
