import { processando } from "../helpers/processando.js";
import { t } from "../helpers/t.js";
import { nomeUsuario } from "../helpers/nomeUsuario.js";
import { emailUsuario } from "../helpers/emailUsuario.js";
import { dataHoraInteracao } from "../helpers/dataHoraInteracao.js";
import { detalhes } from "../helpers/detalhes.js";
<React.Fragment>
  {processando}
  <h4>
    <i className="material-icons left">assignment</i>
    {t}
  </h4>
  <blockquote>{t}</blockquote>
  <div
    className="row"
    style={{
      marginTop: "10px",
    }}
  >
    <div className="input-field col m12 s12">
      <input disabled="" value={chamado.titulo} id="titulo" type="text" />
      <label htmlFor="titulo">{t}</label>
    </div>
    <div className="input-field col m2 s12">
      <input disabled="" value={chamado.id} id="codigo" type="text" />
      <label htmlFor="codigo">{t}</label>
    </div>
    <div className="input-field col m4 s12">
      <input disabled="" value={chamado.tipoDescr} id="tipo" type="text" />
      <label htmlFor="tipo">{t}</label>
    </div>
    <div className="input-field col m4 s12">
      <select disabled="">
        <option value="1">{t}</option>
        <option value="2">{t}</option>
        <option value="3">{t}</option>
        <option value="4">{t}</option>
      </select>
      <label>{t}</label>
    </div>
    {modals / anexos - chamado}
    <div className="input-field col m2 s12">
      <a
        className="btn modal-trigger"
        href="#anexos-chamado"
        style={{
          width: "100%",
        }}
      >
        {t}
      </a>
    </div>
    <div className="input-field col s12">
      <textarea id="detalhes" className="materialize-textarea" disabled="">
        {chamado.detalhes}
      </textarea>
      <label htmlFor="detalhes">Detalhes</label>
    </div>
    <div className="input-field col m12 s12">
      <ul id="lista-interacoes" className="collection">
        {interacao.listaInteracoes && (
          <div>
            {interacao.listaInteracoes && interacao.listaInteracoes
              ? interacao.listaInteracoes.map((item, i) => (
                  <React.Fragment key={i}>
                    <li className="collection-item">
                      <span className="collection-item-title">
                        <b>
                          {nomeUsuario ? (
                            <React.Fragment>
                              {nomeUsuario}({emailUsuario})
                            </React.Fragment>
                          ) : (
                            <React.Fragment>{emailUsuario}</React.Fragment>
                          )}
                        </b>
                        {t}
                        <b>{dataHoraInteracao}</b>:
                      </span>
                      <div className="collection-item-body">{detalhes}</div>
                    </li>
                  </React.Fragment>
                ))
              : null}
          </div>
        )}
      </ul>
    </div>
    {chamado.situacao != "4" ? (() => ["    ", null, "\n"])() : null}
    <div className="input-field col s12 m12">
      {chamado.situacao != "4" ? (() => [null, "\n"])() : null}
      <a className="btn-flat" onClick="window.history.go(-1); return false;">
        {t}
      </a>
    </div>
  </div>
  <script src="/js/chamado.js"></script>
</React.Fragment>;
