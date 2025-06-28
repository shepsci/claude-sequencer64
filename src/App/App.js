import React from 'react';
import { HashRouter, Redirect, Route } from 'react-router-dom';
import ErrorBoundary from 'App/ErrorBoundary/ErrorBoundary';
import { Subscriptions } from 'App/Subscriptions';
import { Provider } from 'react-redux';
import store from 'App/store';
import { setLog } from 'App/reducers/appSlice';
import { StatusBar } from './StatusBar/StatusBar';
import { Preparing } from './shared/Preparing/Preparing';
import { SequencerPage } from './Sequencer/Sequencer';
import { ChangeKit } from './Sequencer/MainSection/ChangeKit/ChangeKit';
import { LoadSave } from './Sequencer/LoadSave/LoadSave';
import { LoginPage } from './Login/LoginPage';
import { InfoPage } from './Info/InfoPage';
import { MainMixer } from './Sequencer/MainSection/Mixer/MainMixer';
import { SampleMixer } from './Sequencer/MainSection/Mixer/SampleMixer';
import { PATHS } from 'hooks/useGoTo';
import { AuthSuccess } from './AuthSuccess';

export default function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <Provider store={store}>
            <AppContent />
            <Subscriptions />
        </Provider>
      </ErrorBoundary>
    </HashRouter>
  );
}

const AppContent = () => {
  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '120px',
        zIndex: 9999,
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '10px',
        background: 'transparent',
        pointerEvents: 'none',
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '5px',
        textShadow: '2px 2px 4px black, -2px -2px 4px black, 2px -2px 4px black, -2px 2px 4px black'
      }}>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
        <span>CLAUDE</span>
      </div>
      <Route path='/' exact render={() => <Redirect to={PATHS.BASE} />} />
      <Route path='/auth/success/:authToken' component={AuthSuccess} />
      <Route path={PATHS.BASE} exact component={SequencerPage} />
      <Route path='/sequencer/:shared' component={SequencerPage} />
      <Route path={PATHS.CHANGE_KIT} component={ChangeKit} />
      <Route path={PATHS.GLOBAL_MIXER} component={MainMixer}/>
      <Route path={PATHS.SAMPLE_MIXER} component={SampleMixer}/>
      <Route path={PATHS.LOAD} render={() => <LoadSave tab='load' />} />
      <Route path={PATHS.SAVE} render={() => <LoadSave tab='save' />} />
      <Route path={PATHS.LOGIN} component={LoginPage} />
      <Route path={PATHS.INFO} component={InfoPage} />
      <StatusBar />
      <Preparing />
    </>
  );
};


window.log = (message) => store.dispatch(setLog(message));