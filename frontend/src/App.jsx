// import { useState } from 'react'
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './App.css'
import Navbar from './components/navbar/Navbar.jsx';
import Sidebar from './components/sidebar/Sidebar.jsx';
import VideoMenu from './components/vid-menu/VideoMenu.jsx';
import Watch from './components/video/Watch.jsx';
import ChannelPage from './components/channel/ChannelPage.jsx';
import UploadPage from './components/pages/upload/UploadPage.jsx';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './components/pages/login/LoginPage.jsx';
import Explore from './components/pages/explore/Explore.jsx';
import Subscription from './components/pages/subscription/Subscription.jsx';
import Music from './components/pages/music/Music.jsx';
import YouPage from './components/pages/you/YouPage.jsx';
import Profile from './components/pages/account/Profile.jsx';
import ChangePassword from './components/pages/account/ChangePassword.jsx';
import EditPage from './components/pages/upload/EditPage.jsx';
import ChannelCustomize from './components/pages/upload/ChannelCustomize.jsx';
import StudioPage from './components/pages/studio/StudioPage.jsx';
import SearchPage from './components/pages/search/SearchPage.jsx';
import OAuthCallback from './components/pages/OAuth/OAuthCallback.jsx';

function App() {

useEffect(() => {
          document.title = "FanTube";
      }, []);
  return (
    <>
      <Navbar />
      <div className="main-menu">
        <div className="sidebar-container"><Sidebar /></div>

        <div className='content'>
          <Routes>
            <Route path="/" element={<VideoMenu />} />
            <Route path="/watch/:videoId" element={<Watch />} />
            <Route path='/video/:videoId/edit' element={<EditPage />} />
            <Route path="/channel/:channelId" element={<ChannelPage />} />
            <Route path='/upload' element={<UploadPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/explore' element={<Explore />} />
            <Route path='/music' element={<Music />} />
            <Route path='/subscriptions' element={<Subscription />} />
            <Route path='/you' element={<YouPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/profile' element={<Profile />} />
            <Route path='/account/password' element={<ChangePassword />} />
            <Route path='/channel/:channelId/customize' element={<ChannelCustomize />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />


          </Routes>
        </div>
      </div>
    </>
  )
}

export default App
