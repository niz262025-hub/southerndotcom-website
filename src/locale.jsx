import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { LANGUAGES, normalizeLanguage, translate } from './locales';
const LocaleContext=createContext({language:'en',setLanguage:()=>{},t:text=>translate(text,'en')});
const STORAGE_KEY='myops.language';
function savedLanguage(){
  try{return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));}catch{return 'en';}
}
export function LocaleProvider({children}){
  const [language,setLanguageValue]=useState(savedLanguage);
  const setLanguage=useCallback(value=>setLanguageValue(normalizeLanguage(value)),[]);
  useEffect(()=>{
    document.documentElement.lang=language;
    try{window.localStorage.setItem(STORAGE_KEY,language);}catch{/* Storage-disabled browsers can still switch language. */}
  },[language]);
  const value=useMemo(()=>({language,setLanguage,t:text=>translate(text,language)}),[language,setLanguage]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
LocaleProvider.propTypes={children:PropTypes.node.isRequired};
// eslint-disable-next-line react-refresh/only-export-components
export function useLocale(){return useContext(LocaleContext);}
export function LanguageSelector(){
  const {language,setLanguage}=useLocale();
  return <label className="language-selector"><span>Language / Bahasa / 语言 / மொழி</span><select aria-label="Language / Bahasa / 语言 / மொழி" value={language} onChange={event=>setLanguage(event.target.value)}>
    {Object.entries(LANGUAGES).map(([value,label])=><option key={value} value={value}>{label}</option>)}
  </select></label>;
}
