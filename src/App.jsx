import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { GameProvider } from './context/GameContext'
import { ActivityProvider } from './context/ActivityContext'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Library from './pages/Library'
import GameDetail from './pages/GameDetail'
import Stats from './pages/Stats'
import GameList from './pages/GameList'
import PlayerProfile from './pages/PlayerProfile'
import GamePage from './pages/GamePage'
import LoreMap from './pages/LoreMap'
import Admin from './pages/Admin'
import Chat from './pages/Chat'
import OAuthCallback from './pages/OAuthCallback'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import EmailVerify from './pages/EmailVerify'

import Navbar from './components/Navbar'

function PrivateRoute({ children }) {
  const { currentUser } = useAuth()
  return currentUser ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { currentUser, isAdmin } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/library" replace />
  return children
}

function AppRoutes() {
  const { currentUser } = useAuth()

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={
          currentUser ? <Navigate to="/library" replace /> : <Login />
        } />
        <Route path="/register" element={
          currentUser ? <Navigate to="/library" replace /> : <Register />
        } />
        <Route path="/library" element={
          <PrivateRoute><Library /></PrivateRoute>
        } />
        <Route path="/game/:id" element={
          <PrivateRoute><GameDetail /></PrivateRoute>
        } />
        <Route path="/stats" element={
          <PrivateRoute><Stats /></PrivateRoute>
        } />
        <Route path="/gamelist" element={
          <PrivateRoute><GameList /></PrivateRoute>
        } />
        <Route path="/player/:userId" element={
          <PrivateRoute><PlayerProfile /></PrivateRoute>
        } />
        <Route path="/games/:title" element={<PrivateRoute><GamePage /></PrivateRoute>} />
        <Route path="/games/:title/lore" element={<PrivateRoute><LoreMap /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/email-verify" element={<EmailVerify />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ActivityProvider>
        <AuthProvider>
          <GameProvider>
            <AppRoutes />
          </GameProvider>
        </AuthProvider>
      </ActivityProvider>
    </BrowserRouter>
  )
}
