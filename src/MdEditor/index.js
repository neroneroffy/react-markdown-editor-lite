// markdown editor 
import React from 'react'
import MarkdownIt from 'markdown-it'
import emoji from 'markdown-it-emoji'
import subscript from 'markdown-it-sub'
import superscript from 'markdown-it-sup'
import footnote from 'markdown-it-footnote'
import deflist from 'markdown-it-deflist'
import abbreviation from 'markdown-it-abbr'
import insert from 'markdown-it-ins'
import mark from 'markdown-it-mark'
import tasklists from 'markdown-it-task-lists'

import Logger from '../utils/logger'
import Decorate from '../utils/decorate'
import NavigationBar from '../NavigationBar'
import DropList from '../DropList'
import Icon from '../Icon'
import ToolBar from '../ToolBar'
import _config from '../config.js'
import './index.less'

export class HtmlRender extends React.Component {
  render() {
    return (      
      <div dangerouslySetInnerHTML = {{ __html: this.props.html}} className={'custom-html-style'} />  
    )
  }
}

class HtmlCode extends React.Component {
  render() {
    return ( 
      <textarea className="html-code" value={this.props.html} onChange={() => {}}></textarea>
    )
  }
}

class MdEditor extends React.Component {
  constructor(props) {
    super(props)    
    this.config = this.initConfig()
    this.state = {
      text: (this.props.value || '').replace(/↵/g,'\n'),
      html: '',      
      view: this.config.view,
      htmlType: 'render', // 'render' 'source'
      dropButton: {
        header: false
      }
    }
  } 

  config = {}

  logger = {}

  loggerTimerId = null

  mdjs = null  

  mdText = null
  
  initialSelection = {
    isSelected: false,
    start: 0,
    end: 0,
    text: ''
  }

  selection = {...this.initialSelection}

  componentDidMount() {
    this.init()
    this.initLogger()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value === this.props.value) {
      // console.log('value not change')
      return
    }   
    let { value } = nextProps    
    const {text} = this.state
    value = value && value.replace(/↵/g, '\n')    
    this.setState({
      text: value,
      html: this.renderHTML(value)
    })
  }

  componentWillUnmount () {
    this.endLogger()
  }

  init = () => {
    const { value } = this.props
    this.mdjs = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    })
    // 插件
    this.mdjs.use(emoji)
    .use(subscript)
    .use(superscript)
    .use(footnote)
    .use(deflist)
    .use(abbreviation)
    .use(insert)
    .use(mark)
    .use(tasklists, { enabled: this.taskLists })

    this.setState({
      html: this.renderHTML(value)
    })
  }

  initConfig = () => {
    return {..._config, ...this.props.config}
  }

  initLogger = () => {
    this.logger = new Logger()
    this.startLogger()
  }

  startLogger = () => {    
    if (!this.loggerTimerId) {
      this.loggerTimerId = setInterval(() => {
        const {text} = this.state
        if (this.logger.getLastRecord() !== text) {
          this.logger.pushRecord(text)        
        }
      }, this.config.logger.interval)
    }   
    // 清空redo历史
    this.logger.cleanRedoList() 
  }

  endLogger = () => {
    if (this.loggerTimerId) {
      clearInterval(this.loggerTimerId)
      this.loggerTimerId = null
    }    
  }

  handleGetLogger = () => {
    console.log('handleGetLogger', this.logger)
  }

  handleUndo = () => {
    this.logger.undo((last) => {
      this.endLogger()
      this._setMdText(last)
    })
  }

  handleRedo = () => {
    this.logger.redo((last) => {
      this._setMdText(last)
    })
  }

  handleDecorate = (type) => {
    const clearList = [
      'h1', 
      'h2', 
      'h3', 
      'h4', 
      'h5', 
      'h6', 
      'bold', 
      'italic', 
      'underline', 
      'strikethrough', 
      'unorder', 
      'order', 
      'image', 
      'link'
    ]
    if (clearList.indexOf(type) > -1) {
      if (!this.selection.isSelected) {
        return
      }
      const content = this._getDecoratedText(type)
      this._setMdText(content)
      this._clearSelection()
    } else {
      const content = this._getDecoratedText(type)
      this._setMdText(content)
    }    
  }

  _getDecoratedText = (type) => {
    const {text} = this.state
    const {selection} = this
    const beforeContent = text.slice(0, selection.start)
    const afterContent = text.slice(selection.end, text.length)
    const decorate = new Decorate(selection.text)
    let decoratedText = ''
    if (type === 'image') {
      decoratedText = decorate.getDecoratedText(type, {
        imageUrl: this.config.imageUrl
      })
    } else if (type === 'link') {
      decoratedText = decorate.getDecoratedText(type, {
        linkUrl: this.config.linkUrl
      })
    } else {
      decoratedText = decorate.getDecoratedText(type)
    }
    const result = beforeContent + `${decoratedText}` + afterContent
    return result
  }

  renderHTML = (markdownText = '') => { 
    return this.mdjs.render(markdownText)
  }

  changeView = (key = 'md', val = true) =>{
    const view = {...this.state.view, ...{
      [key]: val
    }}
    this.setState({
      view: view
    }, () => {
    })
  }

  handleToggleMenu = () => {
    const {view} = this.state
    this.changeView('menu', !view.menu)
  }

  handleMdPreview = () => {
    const {view} = this.state
    this.changeView('html', !view.html)
  }

  handleHtmlPreview = () => {
    const {view} = this.state
    this.changeView('md', !view.md)
  }

  hanldeToggleHtmlType = () => {
    let {htmlType} = this.state
    if (htmlType === 'render') {
      htmlType = 'source'
    } else if (htmlType === 'source') {
      htmlType = 'render'
    }
    this.setState({
      htmlType: htmlType
    })
  }

  handleEmpty = () => {
    if (window.confirm) {
      const result = window.confirm('Are you sure to empty markdown ?')
      if (result) {
        this.setState({
          text: '',
          html: ''
        })
      }
    }    
  }

  handleChange = (e) => {
    this.startLogger() 
    const value = e.target.value   
    this._setMdText(value)
  }

  handleInputSelect = (e) => {
    e.persist()    
    this.selection = {...this.selection, ...{isSelected: true}, ...this._getSelectionInfo(e)}
    // console.log('handleInputSelect', e, this.selection)
  }

  _clearSelection = () => {
    this.selection = {...this.initialSelection}
  }

  _getSelectionInfo = (e) => {
    const source = e.srcElement || e.target
    const start = source.selectionStart
    const end = source.selectionEnd
    const text = (source.value || '').slice(start, end)
    const selection = {start, end, text}
    return selection
  }

  _setMdText = (value = '') => {
    // console.log('value', {value: value.replace(/[\n]/g,'\\n')})
    // const text = value.replace(/[\n]/g,'\\n')
    const text = value.replace(/↵/g,'\n')
    const html = this.renderHTML(text)
    this.setState({
      html,
      text: value
    })
    this.onEmit({
      text,
      html
    })
  }

  onEmit = (output) => {
    const { onChange } = this.props;
    onChange && onChange(output)
  }  

  getMdValue = () => {    
    return this.state.text
  }

  getHtmlValue = () => {
    return this.state.html
  }

  showDropList = (type = 'header', flag) => {
    const {dropButton} = this.state
    this.setState({
      dropButton: {...dropButton, [type]: flag}
    })
  }

  render() {    
    const { view, dropButton } = this.state    
    const renderNavigation = () => {
      return view.menu && 
      <NavigationBar 
        left={
          <div className="button-wrap">
            <span className="button" title="header" 
              onMouseEnter={() => this.showDropList('header', true)} 
              onMouseLeave={() => this.showDropList('header', false)} 
              >
            <Icon type="icon-header"/>
            <DropList 
              show={dropButton.header}
              onClose={() => {
                this.showDropList('header', false)
              }}
              render={() => {
                return (
                  <ul>
                    <li className="drop-item"><h1 onClick={() => this.handleDecorate('h1')}>H1</h1></li>  
                    <li className="drop-item"><h2 onClick={() => this.handleDecorate('h2')}>H2</h2></li>  
                    <li className="drop-item"><h3 onClick={() => this.handleDecorate('h3')}>H3</h3></li>  
                    <li className="drop-item"><h4 onClick={() => this.handleDecorate('h4')}>H4</h4></li>  
                    <li className="drop-item"><h5 onClick={() => this.handleDecorate('h5')}>H5</h5></li>  
                    <li className="drop-item"><h6 onClick={() => this.handleDecorate('h6')}>H6</h6></li>  
                  </ul>
                )
              }}
            />        
            </span>
            <span className="button" title="bold" onClick={() => this.handleDecorate('bold')}><Icon type="icon-bold"/></span>
            <span className="button" title="italic" onClick={() => this.handleDecorate('italic')}><Icon type="icon-italic"/></span>            
            <span className="button" title="italic" onClick={() => this.handleDecorate('underline')}><Icon type="icon-underline"/></span> 
            <span className="button" title="strikethrough" onClick={() => this.handleDecorate('strikethrough')}><Icon type="icon-strikethrough"/></span> 
            <span className="button" title="unorder" onClick={() => this.handleDecorate('unorder')}><Icon type="icon-list-ul"/></span>    
            <span className="button" title="order" onClick={() => this.handleDecorate('order')}><Icon type="icon-list-ol"/></span>    
            
            <span className="button" title="image" onClick={() => this.handleDecorate('image')}><Icon type="icon-photo"/></span> 
            <span className="button" title="link" onClick={() => this.handleDecorate('link')}><Icon type="icon-link"/></span>           
                                 
            <span className="button" title="empty" onClick={this.handleEmpty}><Icon type="icon-trash"/></span>            
            <span className="button" title="undo" onClick={this.handleUndo}><Icon type="icon-reply"/></span>
            <span className="button" title="redo" onClick={this.handleRedo}><Icon type="icon-share"/></span>            
          </div> 
        }
      />
    }
    const renderContent = () => {       
      const { html, text, view, htmlType } = this.state 
      const MD = (
        <section className={'sec-md'}>
          <ToolBar
            render={
              <>
                <span className="button" title={view.menu ? 'hidden menu' : 'show menu'} onClick={this.handleToggleMenu}>
                  {view.menu ? <Icon type="icon-chevron-up"/> 
                    :<Icon type="icon-chevron-down"/>
                  }
                </span>
                <span className="button" title={view.html ? 'preview' : 'both'} onClick={this.handleMdPreview}>
                  {view.html ? <Icon type="icon-desktop"/> 
                    :<Icon type="icon-columns"/>
                  }
                </span>                
              </>
            }
          ></ToolBar>
          <textarea
            id="textarea"
            ref={node => this.mdText = node}
            value={text}
            className={'input'}
            wrap="hard"
            onChange={this.handleChange}
            onSelect={this.handleInputSelect}
          />
        </section>
      )
      const PREVIEW = (
        <section className={'sec-html'}>
          <ToolBar
            style={{right: '20px'}}
            render={
              <>
                <span className="button" title={view.menu ? 'hidden menu' : 'show menu'} onClick={this.handleToggleMenu}>
                  {view.menu ? <Icon type="icon-chevron-up"/> 
                    :<Icon type="icon-chevron-down"/>
                  }
                </span>
                <span className="button" title={view.md ? 'preview' : 'both'} onClick={this.handleHtmlPreview}>
                  {view.md ? <Icon type="icon-desktop"/> 
                    :<Icon type="icon-columns"/>
                  }
                </span>
                <span className="button" title="HTML code" onClick={this.hanldeToggleHtmlType}>
                  {htmlType === 'render' ? <Icon type="icon-code"/>
                    : <Icon type="icon-eye"/>
                  }
                </span>
              </>
            }
          ></ToolBar>          
          {htmlType === 'render' ? 
            <div className="html-wrap"><HtmlRender html={html}/></div>
            : <div className={'html-code-wrap'}><HtmlCode html={html}/></div>
          }  
        </section>
      )      
      return (
        <>
          {view.md && MD}
          {view.html && PREVIEW}
        </>
      )
    }    
    return ( 
      <div className={'rc-md2html-editor'} style={this.props.style}>        
        {renderNavigation()}        
        <div className="editor-container">   
          {renderContent()}
        </div>
      </div>
    )
  }
}
MdEditor.HtmlRender = HtmlRender
export default MdEditor