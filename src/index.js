// React와 ReactDOM을 불러옵니다
import React from 'react';
import ReactDOM from 'react-dom';

// 방금 만든 계산기 컴포넌트를 불러옵니다
import HighOrderCalculator from './HighOrderCalculator';

// 전역 스타일(필요 시) or Tailwind 등 CSS를 여기서 로드합니다
import './index.css';

// ReactDOM.render를 통해 <HighOrderCalculator />를 div#root에 마운트
ReactDOM.render(
  <React.StrictMode>
    <HighOrderCalculator />
  </React.StrictMode>,
  document.getElementById('root')
);
