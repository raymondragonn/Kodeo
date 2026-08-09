import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PageMeta from '../components/PageMeta';
import { COPY } from '../data/copy';
import { useLang } from '../lib/lang';
import { useTheme, toggleTheme } from '../lib/theme';
import { useUser, setUser, logout } from '../lib/session';
import { useSharedNavProps } from '../lib/useSharedNavProps';

/**
 * El portal privado y las páginas transaccionales siguen siendo una SPA con
 * react-router: están detrás de login o dependen de estado en memoria, así que
 * no ganan nada con el pre-renderizado.
 *
 * Sus componentes no se han tocado — este archivo es el App.jsx anterior
 * recortado a las rutas que no son de marketing.
 */

const LoginPage             = lazy(() => import('../components/LoginPage'));
const RegisterPage          = lazy(() => import('../components/RegisterPage'));
const ForgotPasswordPage    = lazy(() => import('../components/ForgotPasswordPage'));
const ResetPasswordPage     = lazy(() => import('../components/ResetPasswordPage'));
const SelectProductPage     = lazy(() => import('../components/SelectProductPage'));
const Checkout              = lazy(() => import('../components/Checkout'));
const PaymentConfirmedPage  = lazy(() => import('../components/PaymentConfirmedPage'));
const OrderPaymentPage      = lazy(() => import('../components/OrderPaymentPage'));
const ReviewPage            = lazy(() => import('../components/ReviewPage'));
const AppointmentPage       = lazy(() => import('../components/AppointmentPage'));
const ClientDashboard       = lazy(() => import('../components/ClientDashboard'));
const ProjectsPage          = lazy(() => import('../components/ProjectsPage'));
const OrdersPage            = lazy(() => import('../components/OrdersPage'));
const AccountPage           = lazy(() => import('../components/AccountPage'));
const AnalyticsPage         = lazy(() => import('../components/AnalyticsPage'));
const UsersPage             = lazy(() => import('../components/UsersPage'));
const UserDetailPage        = lazy(() => import('../components/UserDetailPage'));

function Portal() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const lang      = useLang();
  const theme     = useTheme();
  const user      = useUser();
  const copy      = COPY[lang] || COPY.es;

  // "/" no es una ruta de este router (lo sirve Astro como página estática
  // aparte), así que navigate('/') solo cambiaba la URL sin cargar nada real
  // y caía en el catch-all de abajo. Login/Register/ForgotPassword/
  // ResetPassword/Review son las únicas páginas que navegan a "/" (para
  // volver al inicio); el resto de sus destinos sí son rutas de este SPA.
  const goHome = (to, options) => {
    if (to === '/') { window.location.assign('/'); return; }
    navigate(to, options);
  };

  // Las páginas públicas de esta SPA (checkout, agendar, reseña) montan Nav y
  // Footer y esperan el mismo objeto de props que la landing.
  const shared = useSharedNavProps();

  // Props que comparten todas las páginas del portal.
  const portalProps = {
    user, copy, theme,
    onThemeToggle: toggleTheme,
    onNavigate: navigate,
    onLogout: logout,
  };

  const requireUser  = (el) => (user ? el : <Navigate to="/login" replace />);
  const requireAdmin = (el) =>
    !user ? <Navigate to="/login" replace />
    : user.role !== 'administrador' ? <Navigate to="/cuenta" replace />
    : el;

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={
          <>
            <PageMeta title="Iniciar sesión | Kodeo" description="Accede a tu cuenta Kodeo." path="/login" />
            <LoginPage copy={copy} theme={theme} onThemeToggle={toggleTheme} onNavigate={goHome} onLoginSuccess={setUser} />
          </>
        } />

        <Route path="/register" element={
          <>
            <PageMeta title="Registrarme | Kodeo" description="Crea tu cuenta en Kodeo." path="/register" />
            <RegisterPage copy={copy} onNavigate={goHome} />
          </>
        } />

        <Route path="/recuperar" element={
          <>
            <PageMeta title="Recuperar contraseña | Kodeo" description="Recupera el acceso a tu cuenta Kodeo." path="/recuperar" />
            <ForgotPasswordPage copy={copy} onNavigate={goHome} />
          </>
        } />

        <Route path="/restablecer" element={
          <>
            <PageMeta title="Restablecer contraseña | Kodeo" description="Crea una nueva contraseña para tu cuenta Kodeo." path="/restablecer" />
            <ResetPasswordPage copy={copy} onNavigate={goHome} />
          </>
        } />

        <Route path="/comprar" element={
          <>
            <PageMeta title="Elige tu proyecto | Kodeo" description="Selecciona el producto que quieres comprar: Landing Page, Sitio Web o Tienda Online." path="/comprar" />
            <SelectProductPage {...shared} onBack={shared.onBack} />
          </>
        } />

        <Route path="/pago" element={
          <>
            <PageMeta title="Pago | Kodeo" description="Completa tu pago de forma segura." path="/pago" />
            <Checkout
              {...shared}
              amount={location.state?.amount}
              service={location.state?.service}
              code={location.state?.code}
              onBack={shared.onBack}
              onNavigate={navigate}
            />
          </>
        } />

        <Route path="/pago-confirmado" element={
          <>
            <PageMeta title="Pago confirmado | Kodeo" description="Confirmación de tu pago." path="/pago-confirmado" />
            <PaymentConfirmedPage />
          </>
        } />

        <Route path="/pago/orden/:token" element={
          <>
            <PageMeta title="Orden de pago | Kodeo" description="Completa el pago de tu proyecto de forma segura." path="/pago/orden" />
            <OrderPaymentPage {...shared} onBack={shared.onBack} onNavigate={navigate} />
          </>
        } />

        <Route path="/resena/:token" element={
          <>
            <PageMeta title={copy.review.metaTitle} description={copy.review.metaDescription} path="/resena" />
            <ReviewPage copy={copy} onNavigate={goHome} />
          </>
        } />

        <Route path="/agendar" element={
          <AppointmentPage {...shared} onBack={shared.onBack} onNavigate={navigate} />
        } />

        <Route path="/citas" element={requireUser(
          <ClientDashboard user={user} copy={copy} onLogout={logout} theme={theme} onThemeToggle={toggleTheme} onNavigate={navigate} />
        )} />
        {/* La ruta se llamaba /panel — se mantiene viva para correos y marcadores antiguos */}
        <Route path="/panel" element={<Navigate to="/citas" replace />} />

        <Route path="/proyectos" element={requireUser(
          <>
            <PageMeta title="Mis proyectos | Kodeo" description="Sigue el avance de tus proyectos y aprueba cambios pendientes." path="/proyectos" />
            <ProjectsPage {...portalProps} />
          </>
        )} />

        <Route path="/pedidos" element={requireUser(
          <>
            <PageMeta title="Mis pedidos | Kodeo" description="Revisa el estado de tus proyectos." path="/pedidos" />
            <OrdersPage {...portalProps} />
          </>
        )} />

        <Route path="/cuenta" element={requireUser(
          <>
            <PageMeta title="Mi cuenta | Kodeo" description="Administra tu información de cuenta." path="/cuenta" />
            <AccountPage {...portalProps} onUserUpdate={setUser} />
          </>
        )} />

        <Route path="/analiticas" element={requireUser(
          <>
            <PageMeta title="Analíticas | Kodeo" description="Panel de analítica de la landing." path="/analiticas" />
            <AnalyticsPage {...portalProps} />
          </>
        )} />

        <Route path="/usuarios" element={requireAdmin(
          <>
            <PageMeta title="Usuarios | Kodeo" description="Gestión de usuarios y roles." path="/usuarios" />
            <UsersPage {...portalProps} />
          </>
        )} />

        <Route path="/usuarios/:userId" element={requireAdmin(
          <>
            <PageMeta title="Detalle de usuario | Kodeo" description="Historial y detalle de un usuario." path="/usuarios" />
            <UserDetailPage {...portalProps} />
          </>
        )} />

        {/* Cualquier otra ruta la sirve Astro como página propia; si se llega
            aquí es que no existe. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function SpaApp() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Portal />
      </BrowserRouter>
    </HelmetProvider>
  );
}
