import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseMcpService } from '../../services/firebaseMcpService';
import { McpApiKey, McpSettingsStatus } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Key,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Code2,
  BookOpen,
  ArrowLeft,
  Lock,
  Layers,
  Sparkles,
  Terminal,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Estilos customizados mobile-1st para o Swagger UI integrados ao Design System do Luisices
 */
const SWAGGER_THEME_CSS = `
  /* Escopo do Swagger UI Luisices */
  .swagger-ui-custom-theme {
    width: 100%;
    max-width: 100%;
    font-family: inherit;
    color: var(--foreground);
  }

  .swagger-ui-custom-theme .swagger-ui {
    font-family: inherit !important;
    color: var(--foreground) !important;
  }

  .swagger-ui-custom-theme .swagger-ui * {
    box-sizing: border-box;
  }

  .swagger-ui-custom-theme .swagger-ui .wrapper {
    padding: 0 !important;
    max-width: 100% !important;
  }

  /* Ocultar barra superior padrão do Swagger e links desnecessários */
  .swagger-ui-custom-theme .swagger-ui .topbar,
  .swagger-ui-custom-theme .swagger-ui .information-container .link,
  .swagger-ui-custom-theme .swagger-ui .download-url-wrapper,
  .swagger-ui-custom-theme .swagger-ui .info hgroup.main a,
  .swagger-ui-custom-theme .swagger-ui svg.copy-to-clipboard {
    display: none !important;
  }

  /* Cabeçalho de Informações da API */
  .swagger-ui-custom-theme .swagger-ui .info {
    margin: 0 0 1rem 0 !important;
    padding: 0.875rem 1rem !important;
    border-radius: var(--radius, 0.75rem) !important;
    background: var(--muted) !important;
    border: 1px solid var(--border) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .info .main {
    margin: 0 !important;
    padding: 0 !important;
  }

  .swagger-ui-custom-theme .swagger-ui .info .title {
    font-family: inherit !important;
    font-size: 1.05rem !important;
    font-weight: 700 !important;
    line-height: 1.35 !important;
    color: var(--foreground) !important;
    margin: 0 0 0.375rem 0 !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 0.375rem !important;
  }

  @media (min-width: 640px) {
    .swagger-ui-custom-theme .swagger-ui .info .title {
      font-size: 1.25rem !important;
    }
  }

  .swagger-ui-custom-theme .swagger-ui .info .title small {
    top: 0 !important;
    margin: 0 !important;
  }

  .swagger-ui-custom-theme .swagger-ui .info .title small pre {
    padding: 0 !important;
    margin: 0 !important;
  }

  .swagger-ui-custom-theme .swagger-ui .info .title .version {
    font-size: 0.6875rem !important;
    font-weight: 600 !important;
    background: var(--card) !important;
    color: var(--foreground) !important;
    padding: 0.125rem 0.45rem !important;
    border-radius: 9999px !important;
    border: 1px solid var(--border) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .info .title .oas-badge {
    font-size: 0.6875rem !important;
    font-weight: 600 !important;
    background: rgba(14, 165, 233, 0.15) !important;
    color: #38bdf8 !important;
    padding: 0.125rem 0.45rem !important;
    border-radius: 9999px !important;
    border: 1px solid rgba(14, 165, 233, 0.3) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .info .description {
    margin: 0 !important;
    font-size: 0.75rem !important;
    line-height: 1.45 !important;
    color: var(--muted-foreground) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .info .description p {
    margin: 0 !important;
    font-size: 0.75rem !important;
    color: var(--muted-foreground) !important;
  }

  /* Seletor de Servidores */
  .swagger-ui-custom-theme .swagger-ui .scheme-container {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0 0 0.75rem 0 !important;
    margin: 0 !important;
  }

  .swagger-ui-custom-theme .swagger-ui .servers-title {
    font-size: 0.7rem !important;
    font-weight: 600 !important;
    color: var(--muted-foreground) !important;
    margin-bottom: 0.25rem !important;
  }

  .swagger-ui-custom-theme .swagger-ui .servers label select {
    width: 100% !important;
    max-width: 100% !important;
    font-size: 0.75rem !important;
    font-family: monospace !important;
    background: var(--card) !important;
    color: var(--foreground) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0.5rem !important;
    padding: 0.375rem 0.5rem !important;
  }

  /* Seções de Tags e Agrupamentos */
  .swagger-ui-custom-theme .swagger-ui .opblock-tag-section {
    margin-bottom: 0.75rem !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-tag {
    font-family: inherit !important;
    font-size: 0.8125rem !important;
    font-weight: 700 !important;
    color: var(--foreground) !important;
    border-bottom: 1px solid var(--border) !important;
    padding: 0.375rem 0 !important;
    margin: 0 0 0.5rem 0 !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-tag small {
    font-size: 0.7rem !important;
    color: var(--muted-foreground) !important;
    font-weight: normal !important;
  }

  /* Blocos de Endpoints (Operações) */
  .swagger-ui-custom-theme .swagger-ui .opblock {
    margin: 0 0 0.5rem 0 !important;
    border-radius: var(--radius, 0.75rem) !important;
    border: 1px solid var(--border) !important;
    background: var(--card) !important;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03) !important;
    overflow: hidden !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock.opblock-post {
    background: rgba(16, 185, 129, 0.04) !important;
    border-color: rgba(16, 185, 129, 0.22) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock.opblock-get {
    background: rgba(59, 130, 246, 0.04) !important;
    border-color: rgba(59, 130, 246, 0.22) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock.opblock-delete {
    background: rgba(239, 68, 68, 0.04) !important;
    border-color: rgba(239, 68, 68, 0.22) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-summary {
    padding: 0.5rem 0.625rem !important;
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 0.375rem !important;
    cursor: pointer !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-summary-method {
    font-size: 0.625rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;
    border-radius: 0.375rem !important;
    padding: 0.2rem 0.45rem !important;
    min-width: 44px !important;
    text-align: center !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-post .opblock-summary-method {
    background: #10b981 !important;
    color: #ffffff !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-get .opblock-summary-method {
    background: #3b82f6 !important;
    color: #ffffff !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-summary-path {
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    font-family: monospace !important;
    color: var(--foreground) !important;
    word-break: break-all !important;
    max-width: calc(100% - 60px) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-summary-description {
    font-size: 0.7rem !important;
    color: var(--muted-foreground) !important;
    width: 100% !important;
    margin-top: -0.125rem !important;
  }

  /* Corpo Expandido */
  .swagger-ui-custom-theme .swagger-ui .opblock-body {
    background: var(--card) !important;
    padding: 0.625rem !important;
    border-top: 1px solid var(--border) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-description-wrapper p {
    font-size: 0.75rem !important;
    color: var(--muted-foreground) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-section-header {
    background: var(--muted) !important;
    padding: 0.3125rem 0.5rem !important;
    border-radius: 0.375rem !important;
    margin-bottom: 0.375rem !important;
  }

  .swagger-ui-custom-theme .swagger-ui .opblock-section-header h4 {
    font-size: 0.7rem !important;
    font-weight: 700 !important;
    color: var(--foreground) !important;
  }

  /* Tabelas de Parâmetros */
  .swagger-ui-custom-theme .swagger-ui table {
    width: 100% !important;
    border-collapse: collapse !important;
  }

  .swagger-ui-custom-theme .swagger-ui .parameters-container {
    overflow-x: auto !important;
  }

  .swagger-ui-custom-theme .swagger-ui table thead tr th {
    font-size: 0.625rem !important;
    font-weight: 600 !important;
    color: var(--muted-foreground) !important;
    text-transform: uppercase !important;
    border-bottom: 1px solid var(--border) !important;
    padding: 0.25rem 0.375rem !important;
  }

  .swagger-ui-custom-theme .swagger-ui table tbody tr td {
    padding: 0.375rem 0.375rem !important;
    border-bottom: 1px solid var(--border) !important;
    font-size: 0.7rem !important;
    color: var(--foreground) !important;
    vertical-align: top !important;
  }

  .swagger-ui-custom-theme .swagger-ui .parameter__name {
    font-size: 0.7rem !important;
    font-weight: 600 !important;
    color: var(--foreground) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .parameter__type {
    font-size: 0.625rem !important;
    color: var(--muted-foreground) !important;
    font-family: monospace !important;
  }

  /* Inputs, Textareas e Selects para formulários de parâmetros e body */
  .swagger-ui-custom-theme .swagger-ui input[type="text"],
  .swagger-ui-custom-theme .swagger-ui input[type="number"],
  .swagger-ui-custom-theme .swagger-ui input[type="password"],
  .swagger-ui-custom-theme .swagger-ui input[type="email"],
  .swagger-ui-custom-theme .swagger-ui input[type="date"],
  .swagger-ui-custom-theme .swagger-ui textarea,
  .swagger-ui-custom-theme .swagger-ui select,
  .swagger-ui-custom-theme .swagger-ui .body-param-content-type select {
    background: var(--background) !important;
    color: var(--foreground) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0.375rem !important;
    font-size: 0.75rem !important;
    padding: 0.375rem 0.5rem !important;
    width: 100% !important;
    max-width: 100% !important;
    box-shadow: none !important;
    margin-top: 0.25rem !important;
    margin-bottom: 0.25rem !important;
  }

  .swagger-ui-custom-theme .swagger-ui input[type="text"]:focus,
  .swagger-ui-custom-theme .swagger-ui input[type="number"]:focus,
  .swagger-ui-custom-theme .swagger-ui input[type="password"]:focus,
  .swagger-ui-custom-theme .swagger-ui input[type="email"]:focus,
  .swagger-ui-custom-theme .swagger-ui input[type="date"]:focus,
  .swagger-ui-custom-theme .swagger-ui textarea:focus,
  .swagger-ui-custom-theme .swagger-ui select:focus {
    border-color: var(--ring) !important;
    outline: none !important;
    ring: 2px solid var(--ring) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .body-param-content-type {
    margin-bottom: 0.5rem !important;
  }

  .swagger-ui-custom-theme .swagger-ui .body-param-content-type label {
    font-size: 0.7rem !important;
    font-weight: 600 !important;
    color: var(--muted-foreground) !important;
  }

  /* Botões Swagger */
  .swagger-ui-custom-theme .swagger-ui .btn {
    font-size: 0.7rem !important;
    font-weight: 600 !important;
    border-radius: 0.375rem !important;
    padding: 0.3125rem 0.625rem !important;
    border: 1px solid var(--border) !important;
    box-shadow: none !important;
    transition: opacity 0.15s ease !important;
  }

  .swagger-ui-custom-theme .swagger-ui .btn.try-out__btn {
    background: var(--muted) !important;
    color: var(--foreground) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .btn.execute {
    background: var(--primary) !important;
    color: var(--primary-foreground) !important;
    border-color: transparent !important;
  }

  .swagger-ui-custom-theme .swagger-ui .btn.cancel {
    background: transparent !important;
    color: var(--destructive) !important;
    border-color: var(--destructive) !important;
  }

  /* Respostas e Código */
  .swagger-ui-custom-theme .swagger-ui .responses-inner {
    padding: 0.375rem 0 !important;
  }

  .swagger-ui-custom-theme .swagger-ui .response-col_status {
    font-size: 0.7rem !important;
    font-weight: 700 !important;
    color: var(--foreground) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .response-col_description {
    font-size: 0.7rem !important;
    color: var(--muted-foreground) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .highlight-code,
  .swagger-ui-custom-theme .swagger-ui pre {
    background: #09090b !important;
    color: #f4f4f5 !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 0.5rem !important;
    padding: 0.625rem !important;
    font-size: 0.7rem !important;
    line-height: 1.4 !important;
    overflow-x: auto !important;
  }

  .swagger-ui-custom-theme .swagger-ui svg.arrow {
    fill: var(--foreground) !important;
  }

  .swagger-ui-custom-theme .swagger-ui .model-box {
    background: var(--card) !important;
    color: var(--foreground) !important;
    font-size: 0.7rem !important;
  }

  .swagger-ui-custom-theme .swagger-ui section.models {
    border: 1px solid var(--border) !important;
    border-radius: var(--radius, 0.75rem) !important;
    background: var(--card) !important;
    margin-top: 0.75rem !important;
  }

  .swagger-ui-custom-theme .swagger-ui section.models h4 {
    font-size: 0.75rem !important;
    color: var(--foreground) !important;
    border-bottom: 1px solid var(--border) !important;
  }

  /* Botão Authorize do Swagger UI */
  .swagger-ui-custom-theme .swagger-ui .btn.authorize {
    background: transparent !important;
    color: var(--primary) !important;
    border-color: var(--primary) !important;
    border-radius: 0.5rem !important;
    font-size: 0.7rem !important;
    padding: 0.25rem 0.625rem !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.25rem !important;
  }

  .swagger-ui-custom-theme .swagger-ui .btn.authorize svg {
    fill: var(--primary) !important;
  }

  /* Modal de Autenticação Swagger UI: Centralizado no viewport, elegante e integrado */
  .dialog-ux,
  body > .dialog-ux,
  .swagger-ui .dialog-ux,
  .swagger-ui-custom-theme .swagger-ui .dialog-ux {
    position: fixed !important;
    inset: 0 !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    z-index: 999999 !important;
    pointer-events: auto !important;
    margin: 0 !important;
    padding: 1rem !important;
    border: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-sizing: border-box !important;
  }

  .dialog-ux .backdrop-ux,
  body > .dialog-ux .backdrop-ux,
  .swagger-ui .dialog-ux .backdrop-ux,
  .swagger-ui-custom-theme .swagger-ui .dialog-ux .backdrop-ux {
    position: fixed !important;
    inset: 0 !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    background: rgba(0, 0, 0, 0.75) !important;
    backdrop-filter: blur(4px) !important;
    -webkit-backdrop-filter: blur(4px) !important;
    z-index: 1 !important;
    cursor: pointer !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .dialog-ux .modal-ux,
  body > .dialog-ux .modal-ux,
  .swagger-ui .dialog-ux .modal-ux,
  .swagger-ui-custom-theme .swagger-ui .dialog-ux .modal-ux {
    position: relative !important;
    left: auto !important;
    top: auto !important;
    transform: none !important;
    -webkit-transform: none !important;
    z-index: 2 !important;
    width: 100% !important;
    max-width: 500px !important;
    max-height: calc(100dvh - 3rem) !important;
    background-color: var(--card) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0.75rem !important;
    color: var(--foreground) !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.95) !important;
    overflow: hidden !important;
    margin: auto !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
  }

  .dialog-ux .modal-dialog-ux,
  .dialog-ux .modal-ux-inner,
  body > .dialog-ux .modal-dialog-ux,
  body > .dialog-ux .modal-ux-inner,
  .swagger-ui .dialog-ux .modal-dialog-ux,
  .swagger-ui .dialog-ux .modal-ux-inner {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    background: transparent !important;
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .dialog-ux .modal-ux-header,
  body > .dialog-ux .modal-ux-header,
  .swagger-ui .dialog-ux .modal-ux-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 0.875rem 1.25rem !important;
    border-bottom: 1px solid var(--border) !important;
    background: var(--muted) !important;
    width: 100% !important;
    box-sizing: border-box !important;
    flex-shrink: 0 !important;
  }

  .dialog-ux .modal-ux-header h3,
  body > .dialog-ux .modal-ux-header h3,
  .swagger-ui .dialog-ux .modal-ux-header h3 {
    font-size: 0.9375rem !important;
    font-weight: 700 !important;
    color: var(--foreground) !important;
    margin: 0 !important;
    padding: 0 !important;
    letter-spacing: -0.01em !important;
    line-height: 1.25 !important;
    font-family: inherit !important;
  }

  .dialog-ux .modal-ux-header .close-modal,
  body > .dialog-ux .modal-ux-header .close-modal,
  .swagger-ui .dialog-ux .modal-ux-header .close-modal {
    width: 1.75rem !important;
    height: 1.75rem !important;
    padding: 0 !important;
    cursor: pointer !important;
    background: transparent !important;
    border: 1px solid transparent !important;
    border-radius: 0.375rem !important;
    color: var(--muted-foreground) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.15s ease !important;
    flex-shrink: 0 !important;
  }

  .dialog-ux .modal-ux-header .close-modal:hover,
  body > .dialog-ux .modal-ux-header .close-modal:hover,
  .swagger-ui .dialog-ux .modal-ux-header .close-modal:hover {
    background: var(--accent) !important;
    color: var(--foreground) !important;
    border-color: var(--border) !important;
  }

  .dialog-ux .modal-ux-header .close-modal svg,
  .dialog-ux .modal-ux-header .close-modal svg path,
  body > .dialog-ux .modal-ux-header .close-modal svg,
  body > .dialog-ux .modal-ux-header .close-modal svg path,
  .swagger-ui .dialog-ux .modal-ux-header .close-modal svg,
  .swagger-ui .dialog-ux .modal-ux-header .close-modal svg path {
    width: 14px !important;
    height: 14px !important;
    fill: currentColor !important;
  }

  .dialog-ux .modal-ux-content,
  body > .dialog-ux .modal-ux-content,
  .swagger-ui .dialog-ux .modal-ux-content {
    padding: 1.25rem !important;
    overflow-y: auto !important;
    color: var(--foreground) !important;
    background: var(--card) !important;
    box-sizing: border-box !important;
    width: 100% !important;
    flex: 1 1 auto !important;
    max-height: calc(100dvh - 9rem) !important;
  }

  .dialog-ux .auth-container,
  body > .dialog-ux .auth-container,
  .swagger-ui .dialog-ux .auth-container {
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    margin: 0 !important;
  }

  .dialog-ux .auth-container h4,
  body > .dialog-ux .auth-container h4,
  .swagger-ui .dialog-ux .auth-container h4 {
    font-size: 0.8125rem !important;
    font-weight: 700 !important;
    color: var(--foreground) !important;
    margin: 0 0 0.5rem 0 !important;
    display: flex !important;
    align-items: center !important;
    gap: 0.375rem !important;
    flex-wrap: wrap !important;
    font-family: inherit !important;
  }

  .dialog-ux .auth-container h4 code,
  body > .dialog-ux .auth-container h4 code,
  .swagger-ui .dialog-ux .auth-container h4 code {
    font-size: 0.75rem !important;
    background: var(--muted) !important;
    padding: 0.15rem 0.45rem !important;
    border-radius: 0.375rem !important;
    border: 1px solid var(--border) !important;
    color: var(--primary) !important;
    font-weight: 600 !important;
  }

  /* Status badge para chave já autorizada */
  .dialog-ux .auth-container h6,
  body > .dialog-ux .auth-container h6,
  .swagger-ui .dialog-ux .auth-container h6 {
    display: inline-flex !important;
    align-items: center !important;
    font-size: 0.6875rem !important;
    font-weight: 700 !important;
    color: #10b981 !important;
    background: rgba(16, 185, 129, 0.12) !important;
    border: 1px solid rgba(16, 185, 129, 0.3) !important;
    border-radius: 9999px !important;
    padding: 0.15rem 0.55rem !important;
    margin: 0.25rem 0 0.75rem 0 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
  }

  .dialog-ux .auth-container .renderedMarkdown p,
  .dialog-ux .auth-container p,
  body > .dialog-ux .auth-container .renderedMarkdown p,
  body > .dialog-ux .auth-container p,
  .swagger-ui .dialog-ux .auth-container .renderedMarkdown p,
  .swagger-ui .dialog-ux .auth-container p {
    font-size: 0.75rem !important;
    color: var(--muted-foreground) !important;
    line-height: 1.4 !important;
    margin: 0 0 0.5rem 0 !important;
    font-family: inherit !important;
  }

  .dialog-ux .auth-container label,
  body > .dialog-ux .auth-container label,
  .swagger-ui .dialog-ux .auth-container label {
    display: block !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    color: var(--foreground) !important;
    margin: 0.5rem 0 0.25rem 0 !important;
    font-family: inherit !important;
  }

  .dialog-ux .auth-container .wrapper,
  body > .dialog-ux .auth-container .wrapper,
  .swagger-ui .dialog-ux .auth-container .wrapper {
    padding: 0 !important;
    margin: 0 0 0.75rem 0 !important;
    max-width: 100% !important;
    background: transparent !important;
  }

  .dialog-ux .auth-container code,
  body > .dialog-ux .auth-container code,
  .swagger-ui .dialog-ux .auth-container code {
    font-family: monospace !important;
    font-size: 0.8125rem !important;
    background: var(--muted) !important;
    padding: 0.25rem 0.5rem !important;
    border-radius: 0.25rem !important;
    border: 1px solid var(--border) !important;
    color: var(--foreground) !important;
  }

  .dialog-ux .auth-container input[type="text"],
  .dialog-ux .auth-container input[type="password"],
  body > .dialog-ux .auth-container input[type="text"],
  body > .dialog-ux .auth-container input[type="password"],
  .swagger-ui .dialog-ux .auth-container input[type="text"],
  .swagger-ui .dialog-ux .auth-container input[type="password"] {
    width: 100% !important;
    height: 2.25rem !important;
    background: var(--background) !important;
    color: var(--foreground) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0.375rem !important;
    padding: 0.375rem 0.625rem !important;
    font-size: 0.75rem !important;
    font-family: monospace !important;
    margin-top: 0.25rem !important;
    outline: none !important;
    box-shadow: none !important;
    box-sizing: border-box !important;
  }

  .dialog-ux .auth-container input:focus,
  body > .dialog-ux .auth-container input:focus,
  .swagger-ui .dialog-ux .auth-container input:focus {
    border-color: var(--primary) !important;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
  }

  .dialog-ux .auth-btn-wrapper,
  body > .dialog-ux .auth-btn-wrapper,
  .swagger-ui .dialog-ux .auth-btn-wrapper {
    display: flex !important;
    gap: 0.5rem !important;
    align-items: center !important;
    justify-content: flex-end !important;
    padding: 0.875rem 1.25rem !important;
    margin: 1.25rem -1.25rem -1.25rem -1.25rem !important;
    border-top: 1px solid var(--border) !important;
    background: var(--muted) !important;
    flex-shrink: 0 !important;
  }

  .dialog-ux .auth-btn-wrapper .btn,
  body > .dialog-ux .auth-btn-wrapper .btn,
  .swagger-ui .dialog-ux .auth-btn-wrapper .btn {
    height: 2.25rem !important;
    min-height: 2.25rem !important;
    border-radius: 0.375rem !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    padding: 0 1rem !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    box-shadow: none !important;
    transition: all 0.15s ease !important;
  }

  /* Botão primário de Autorização (Verde) */
  .dialog-ux .auth-btn-wrapper .btn.modal-btn.authorize,
  body > .dialog-ux .auth-btn-wrapper .btn.modal-btn.authorize,
  .swagger-ui .dialog-ux .auth-btn-wrapper .btn.modal-btn.authorize {
    background: var(--primary, #10b981) !important;
    color: var(--primary-foreground, #022c22) !important;
    border: none !important;
  }

  .dialog-ux .auth-btn-wrapper .btn.modal-btn.authorize:hover,
  body > .dialog-ux .auth-btn-wrapper .btn.modal-btn.authorize:hover,
  .swagger-ui .dialog-ux .auth-btn-wrapper .btn.modal-btn.authorize:hover {
    opacity: 0.9 !important;
  }

  /* Botão Logout (Destrutivo suave) */
  .dialog-ux .auth-btn-wrapper .btn.modal-btn.auth:not(.authorize):not(.btn-done),
  body > .dialog-ux .auth-btn-wrapper .btn.modal-btn.auth:not(.authorize):not(.btn-done),
  .swagger-ui .dialog-ux .auth-btn-wrapper .btn.modal-btn.auth:not(.authorize):not(.btn-done) {
    background: rgba(239, 68, 68, 0.12) !important;
    color: #ef4444 !important;
    border: 1px solid rgba(239, 68, 68, 0.3) !important;
  }

  .dialog-ux .auth-btn-wrapper .btn.modal-btn.auth:not(.authorize):not(.btn-done):hover,
  body > .dialog-ux .auth-btn-wrapper .btn.modal-btn.auth:not(.authorize):not(.btn-done):hover,
  .swagger-ui .dialog-ux .auth-btn-wrapper .btn.modal-btn.auth:not(.authorize):not(.btn-done):hover {
    background: #ef4444 !important;
    color: #ffffff !important;
    border-color: #ef4444 !important;
  }

  /* Botão Close / Fechar */
  .dialog-ux .auth-btn-wrapper .btn.modal-btn.btn-done,
  body > .dialog-ux .auth-btn-wrapper .btn.modal-btn.btn-done,
  .swagger-ui .dialog-ux .auth-btn-wrapper .btn.modal-btn.btn-done {
    background: var(--card) !important;
    color: var(--foreground) !important;
    border: 1px solid var(--border) !important;
  }

  .dialog-ux .auth-btn-wrapper .btn.modal-btn.btn-done:hover,
  body > .dialog-ux .auth-btn-wrapper .btn.modal-btn.btn-done:hover,
  .swagger-ui .dialog-ux .auth-btn-wrapper .btn.modal-btn.btn-done:hover {
    background: var(--accent) !important;
  }

  /* Blindagem universal para tema escuro e claro */
  .dark .swagger-ui-custom-theme .swagger-ui,
  .dark .swagger-ui-custom-theme .swagger-ui .scheme-container,
  .dark .swagger-ui-custom-theme .swagger-ui .wrapper,
  .dark .swagger-ui-custom-theme .swagger-ui section {
    background-color: transparent !important;
  }

  .dark .swagger-ui-custom-theme .swagger-ui .opblock {
    background-color: var(--card) !important;
  }

  .dark .swagger-ui-custom-theme .swagger-ui .opblock-body {
    background-color: var(--card) !important;
  }
`;

// Cache em memória para transições instantâneas entre menus/rotas sem recarregamento ou tela branca
let memorySchemaCache: any = null;
let memoryStatusCache: McpSettingsStatus | null = null;

// Carregador confiável de scripts externos CDN
function loadExternalScript(src: string, isAvailable: () => boolean): Promise<void> {
  if (isAvailable()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
    if (existing) {
      if (isAvailable()) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.body.appendChild(script);
  });
}

export function ApiDocs() {
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useAuth();

  const [loading, setLoading] = useState<boolean>(!memorySchemaCache);
  const [error, setError] = useState<string | null>(null);
  const [schemaData, setSchemaData] = useState<any>(memorySchemaCache);
  const [mcpStatus, setMcpStatus] = useState<McpSettingsStatus | null>(memoryStatusCache);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [customToken, setCustomToken] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [swaggerReady, setSwaggerReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'swagger' | 'snippets' | 'scopes'>('swagger');

  const swaggerContainerRef = useRef<HTMLDivElement>(null);
  const swaggerInstanceRef = useRef<any>(null);

  // Carrega status e OpenAPI Schema autenticado
  const loadData = async (forceRefresh = false) => {
    if (!memorySchemaCache || forceRefresh) {
      setLoading(true);
    }
    setError(null);
    try {
      const [statusRes, schemaRes] = await Promise.all([
        firebaseMcpService.getStatus().catch(() => null),
        firebaseMcpService.getOpenApiSchema(),
      ]);

      if (statusRes) {
        memoryStatusCache = statusRes;
        setMcpStatus(statusRes);
        const activeKeys = (statusRes.keys || []).filter((k) => k.enabled);
        if (activeKeys.length > 0 && !selectedKeyId) {
          setSelectedKeyId(activeKeys[0].keyId);
        }
      }

      if (schemaRes) {
        memorySchemaCache = schemaRes;
        setSchemaData(schemaRes);
      }
    } catch (err: any) {
      console.error('[ApiDocs] Erro ao carregar schema OpenAPI:', err);
      if (!memorySchemaCache) {
        const rawMsg = err?.message || err?.code || '';
        if (rawMsg.includes('not-found') || rawMsg.includes('404')) {
          setError('Acesso à documentação da API não localizado ou permissão pendente.');
        } else if (rawMsg.includes('permission-denied')) {
          setError('Você não possui permissão para acessar a documentação da API. Solicite liberação ao administrador.');
        } else {
          setError(rawMsg || 'Falha ao autenticar acesso à documentação.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Determina o token ativo para testes e exemplos
  const activeKeyObject = mcpStatus?.keys?.find((k) => k.keyId === selectedKeyId);
  const savedRawKey = selectedKeyId
    ? localStorage.getItem(`mcp_raw_key_${selectedKeyId}`)
    : (localStorage.getItem('mcp_latest_key_id') === mcpStatus?.keys?.[0]?.keyId
        ? localStorage.getItem('mcp_latest_raw_key')
        : null);

  const candidateToken = customToken.trim() || savedRawKey || '';
  const isFullToken = Boolean(candidateToken && candidateToken.length >= 25 && !candidateToken.includes('...'));
  const effectiveToken = candidateToken || activeKeyObject?.keyPrefix || '';

  const effectiveTokenRef = useRef(effectiveToken);
  useEffect(() => {
    effectiveTokenRef.current = effectiveToken;
  }, [effectiveToken]);

  // Inicializa o Swagger UI dinamicamente garantindo que ambos scripts e preset estejam carregados
  useEffect(() => {
    if (loading || error || !schemaData?.schema) return;

    let isMounted = true;

    const initSwagger = async () => {
      try {
        // Carrega CSS se ainda não estiver presente no <head>
        if (!document.getElementById('swagger-ui-css')) {
          const link = document.createElement('link');
          link.id = 'swagger-ui-css';
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui.css';
          document.head.appendChild(link);
        }

        // Carrega SwaggerUIBundle e SwaggerUIStandalonePreset em paralelo
        await Promise.all([
          loadExternalScript(
            'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-bundle.js',
            () => typeof (window as any).SwaggerUIBundle !== 'undefined'
          ),
          loadExternalScript(
            'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js',
            () => typeof (window as any).SwaggerUIStandalonePreset !== 'undefined'
          ).catch((e) => {
            console.warn('[ApiDocs] Standalone preset não disponível (opcional):', e);
          }),
        ]);

        if (!isMounted || !swaggerContainerRef.current) return;

        const SwaggerUIBundle = (window as any).SwaggerUIBundle;
        const SwaggerUIStandalonePreset = (window as any).SwaggerUIStandalonePreset;

        if (!SwaggerUIBundle) {
          throw new Error('SwaggerUIBundle não pôde ser inicializado.');
        }

        // Limpa instância anterior do nó DOM
        swaggerContainerRef.current.innerHTML = '';

        // Clona profundamente o schema para evitar que mutações internas do SwaggerUI corrompam chamadas subsequentes
        const cleanSpec = JSON.parse(JSON.stringify(schemaData.schema));

        const presets = [
          SwaggerUIBundle.presets.apis,
          ...(SwaggerUIStandalonePreset ? [SwaggerUIStandalonePreset] : []),
        ];

        const ui = SwaggerUIBundle({
          spec: cleanSpec,
          domNode: swaggerContainerRef.current,
          deepLinking: true,
          tryItOutEnabled: true,
          defaultModelExpandDepth: 3,
          displayRequestDuration: true,
          filter: true,
          presets,
          layout: 'BaseLayout',
          requestInterceptor: (req: any) => {
            req.headers = req.headers || {};
            const activeToken = effectiveTokenRef.current;
            if (activeToken) {
              req.headers.Authorization = `Bearer ${activeToken}`;
            }
            return req;
          },
        });

        swaggerInstanceRef.current = ui;
        setSwaggerReady(true);

        if (effectiveToken && typeof ui.preauthorizeApiKey === 'function') {
          ui.preauthorizeApiKey('bearerAuth', effectiveToken);
        }
      } catch (swaggerErr: any) {
        console.error('[ApiDocs] Erro ao renderizar Swagger UI:', swaggerErr);
        if (isMounted) {
          setError(swaggerErr?.message || 'Erro ao carregar a interface interativa do Swagger UI.');
        }
      }
    };

    initSwagger();

    return () => {
      isMounted = false;
    };
  }, [loading, error, schemaData]);

  // Atualiza pré-autorização quando a chave muda
  useEffect(() => {
    if (swaggerInstanceRef.current?.preauthorizeApiKey && effectiveToken) {
      swaggerInstanceRef.current.preauthorizeApiKey('bearerAuth', effectiveToken);
    }
  }, [effectiveToken, swaggerReady]);

  // Permite fechar o modal do Swagger UI clicando no backdrop escuro ou pressionando a tecla Escape
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.classList && target.classList.contains('backdrop-ux')) {
        const closeBtn = document.querySelector('.swagger-ui .dialog-ux .close-modal') as HTMLElement | null;
        if (closeBtn) {
          closeBtn.click();
        } else {
          const btnDone = document.querySelector('.swagger-ui .dialog-ux .btn-done') as HTMLElement | null;
          btnDone?.click();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const closeBtn = document.querySelector('.swagger-ui .dialog-ux .close-modal') as HTMLElement | null;
        if (closeBtn) {
          closeBtn.click();
        } else {
          const btnDone = document.querySelector('.swagger-ui .dialog-ux .btn-done') as HTMLElement | null;
          btnDone?.click();
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenSwaggerAuth = () => {
    setActiveTab('swagger');
    setTimeout(() => {
      const authBtn = document.querySelector('.swagger-ui .btn.authorize') as HTMLButtonElement | null;
      if (authBtn) {
        authBtn.click();
      } else if (swaggerInstanceRef.current?.authActions?.showDefinitions) {
        const defs = swaggerInstanceRef.current.authSelectors?.definitionsToAuthorize();
        if (defs) {
          swaggerInstanceRef.current.authActions.showDefinitions(defs);
        }
      }
    }, 150);
  };

  const handleCopyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isDev = schemaData?.environment === 'dev';
  const baseUrl = schemaData?.endpointBaseUrl || 'https://api.luisices.com.br/chatGptToolsEndpoint';

  // Exemplos de código interativos
  const getCodeSnippet = () => {
    switch (selectedLanguage) {
      case 'curl':
        return `# 1. Consultar entregas e pedidos do dia
curl -X POST "${baseUrl}/tools/daily_briefing" \\
  -H "Authorization: Bearer ${effectiveToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"date": "${new Date().toISOString().slice(0, 10)}"}'

# 2. Consultar pedidos na fila de produção
curl -X POST "${baseUrl}/tools/query_orders_view" \\
  -H "Authorization: Bearer ${effectiveToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "em_producao", "limit": 10}'`;

      case 'javascript':
        return `// Exemplo com Fetch API (Node.js / Browser)
const token = "${effectiveToken}";
const endpoint = "${baseUrl}/tools/query_orders_view";

async function fetchOrders() {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${token}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status: "em_producao",
      limit: 10
    })
  });

  const data = await response.json();
  console.log("Pedidos retornados:", data);
}

fetchOrders();`;

      case 'python':
        return `# Exemplo com Python (requests)
import requests

token = "${effectiveToken}"
url = "${baseUrl}/tools/query_orders_view"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

payload = {
    "status": "em_producao",
    "limit": 10
}

response = requests.post(url, json=payload, headers=headers)
print("Status Code:", response.status_code)
print("Resultado:", response.json())`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20 sm:pb-8">
      {/* Estilos Scoped do Swagger UI */}
      <style>{SWAGGER_THEME_CSS}</style>

      {/* Topo / Barra de Navegação Compacta e Responsiva */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/configuracoes')}
            className="size-8 p-0 shrink-0"
            title="Voltar às Configurações"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2 truncate">
              <BookOpen className="size-4.5 sm:size-5.5 text-primary shrink-0" />
              <span className="truncate">Documentação da API (Swagger UI)</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              OpenAPI 3.0.3 autenticada para ChatGPT, MCP e agentes externos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={
              isDev
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] sm:text-xs py-0.5'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] sm:text-xs py-0.5'
            }
          >
            <span className={`inline-block size-1.5 rounded-full mr-1 ${isDev ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {isDev ? 'Dev' : 'Produção'}
          </Badge>

          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] sm:text-xs py-0.5">
            <Lock className="size-2.5 mr-1" />
            Autenticado
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={loading}
            className="h-7 sm:h-8 px-2 sm:px-3 gap-1 text-[11px] sm:text-xs ml-auto sm:ml-0"
          >
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Card de Autenticação Bearer (Compacto & Mobile 1st) */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="p-3 sm:p-5 pb-2 sm:pb-3 space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck className="size-4 sm:size-4.5 text-primary shrink-0" />
              <span>Autenticação da API (Bearer Token)</span>
            </CardTitle>
            <Link
              to="/configuracoes"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium shrink-0"
            >
              <span>Gerenciar Chaves</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>
          <CardDescription className="text-[11px] sm:text-xs leading-relaxed">
            Todas as chamadas exigem <code>Authorization: Bearer &lt;chave&gt;</code>. Selecione uma chave cadastrada ou informe um token para testar diretamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-5 pt-0 sm:pt-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Seleção de Chave Cadastrada */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Usar Chave Cadastrada</Label>
              {mcpStatus?.keys && mcpStatus.keys.length > 0 ? (
                <Select
                  value={selectedKeyId}
                  onValueChange={(val) => {
                    setSelectedKeyId(val);
                    const stored = localStorage.getItem(`mcp_raw_key_${val}`);
                    setCustomToken(stored || '');
                  }}
                >
                  <SelectTrigger className="text-xs h-8 sm:h-9 font-mono">
                    <SelectValue placeholder="Selecione uma chave de API" />
                  </SelectTrigger>
                  <SelectContent>
                    {mcpStatus.keys.map((k) => (
                      <SelectItem key={k.keyId} value={k.keyId} className="text-xs font-mono">
                        {k.keyName} ({k.keyPrefix}) {k.enabled ? '' : '[Desativada]'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 rounded-lg border border-border/60 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Nenhuma chave de API gerada.</span>
                  <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => navigate('/configuracoes')}>
                    Criar Chave
                  </Button>
                </div>
              )}
            </div>

            {/* Inserção de Token Manual */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ou Informar Token Manualmente</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="password"
                  placeholder="lui_live_... ou Bearer token de 64 caracteres"
                  value={customToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    setCustomToken(val);
                    if (val.trim().length >= 25 && selectedKeyId) {
                      localStorage.setItem(`mcp_raw_key_${selectedKeyId}`, val.trim());
                    }
                  }}
                  className="text-xs h-8 sm:h-9 font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyText(effectiveToken, 'token')}
                  className="h-8 sm:h-9 px-2.5 shrink-0 gap-1 text-xs"
                  title="Copiar token"
                >
                  {copiedField === 'token' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  <span className="hidden sm:inline">Copiar</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenSwaggerAuth}
                  className="h-8 sm:h-9 px-2.5 shrink-0 gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10"
                  title="Abrir modal de autorização no Swagger UI"
                >
                  <Lock className="size-3.5" />
                  <span className="hidden sm:inline">Autorizar no Swagger</span>
                  <span className="sm:hidden">Autorizar</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Banner de Validação de Chave Completa */}
          {!isFullToken ? (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" />
              <div className="space-y-0.5">
                <p className="font-semibold text-[11px] sm:text-xs">
                  Atenção: A chave selecionada exibe apenas o prefixo de identificação (<code>{activeKeyObject?.keyPrefix || 'lui_...'}</code>)
                </p>
                <p className="text-[10px] sm:text-[11px] opacity-90 leading-relaxed">
                  Por motivos de segurança, o banco armazena apenas o hash da chave. Cole sua <strong>chave secreta de 64 caracteres</strong> no campo <em>"Ou Informar Token Manualmente"</em> acima para autorizar as chamadas no Swagger UI. Ela será salva no seu navegador para os próximos acessos.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400">
              <Check className="size-3.5 shrink-0 text-emerald-500" />
              <span className="text-[11px] font-medium">Chave secreta completa ativa (<code>{effectiveToken.slice(0, 14)}...</code>) e pronta para execução no Swagger UI.</span>
            </div>
          )}

          <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="shrink-0 font-medium text-foreground text-[11px] sm:text-xs">Base URL:</span>
              <code className="text-[10px] sm:text-[11px] font-mono truncate bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                {baseUrl}
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyText(baseUrl, 'baseUrl')}
              className="h-6 px-2 text-[11px] gap-1 self-start sm:self-auto text-muted-foreground hover:text-foreground"
            >
              {copiedField === 'baseUrl' ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{copiedField === 'baseUrl' ? 'Copiado' : 'Copiar URL'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo Principal com Menu Suspenso (Mobile) e Abas (Desktop) */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-3 sm:space-y-4">
        {/* Menu Suspenso Mobile */}
        <div className="sm:hidden w-full">
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <SelectTrigger className="w-full text-xs font-semibold h-10 bg-card border-border/80 shadow-2xs">
              <SelectValue placeholder="Selecione a visualização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="swagger" className="text-xs font-medium cursor-pointer">
                <div className="flex items-center gap-2">
                  <Layers className="size-3.5 text-primary" />
                  <span>Swagger UI (Explorer Interativo)</span>
                </div>
              </SelectItem>
              <SelectItem value="snippets" className="text-xs font-medium cursor-pointer">
                <div className="flex items-center gap-2">
                  <Code2 className="size-3.5 text-primary" />
                  <span>Exemplos de Código (cURL, JS, Python)</span>
                </div>
              </SelectItem>
              <SelectItem value="scopes" className="text-xs font-medium cursor-pointer">
                <div className="flex items-center gap-2">
                  <Key className="size-3.5 text-primary" />
                  <span>Escopos & Permissões da API</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Abas no Desktop */}
        <div className="hidden sm:block overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex h-9 sm:h-10 items-center justify-start p-1 gap-1 rounded-xl bg-muted/60 border border-border/60 w-max sm:w-auto">
            <TabsTrigger
              value="swagger"
              className="gap-1.5 px-3.5 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Layers className="size-3.5" />
              <span>Swagger UI</span>
            </TabsTrigger>
            <TabsTrigger
              value="snippets"
              className="gap-1.5 px-3.5 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Code2 className="size-3.5" />
              <span>Exemplos de Código</span>
            </TabsTrigger>
            <TabsTrigger
              value="scopes"
              className="gap-1.5 px-3.5 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Key className="size-3.5" />
              <span>Escopos & Permissões</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Aba 1: Swagger UI Interativo */}
        <TabsContent value="swagger" forceMount className="space-y-4 data-[state=inactive]:hidden">
          <div className="border border-border/60 rounded-xl bg-card shadow-xs">
            <div className="bg-muted/30 border-b border-border/60 p-3 sm:p-4 rounded-t-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <FileCode className="size-4 text-primary shrink-0" />
                    <span>Explorer Interativo de Endpoints</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Execute requisições reais com <strong>Try it out</strong>. Autenticação Bearer injetada automaticamente.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadData(true)}
                    disabled={loading}
                    className="h-7 sm:h-8 gap-1.5 text-xs"
                    title="Recarregar especificação OpenAPI"
                  >
                    <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>Recarregar</span>
                  </Button>
                  {schemaData?.openapiUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-7 sm:h-8 gap-1.5 text-xs"
                    >
                      <a href={schemaData.openapiUrl} target="_blank" rel="noreferrer">
                        <span>openapi.json</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2 sm:p-4 relative min-h-[450px]">
              {/* Spinner de carregamento exibido somente quando não há dados em cache */}
              {loading && !schemaData && (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <RefreshCw className="size-8 animate-spin text-primary" />
                  <p className="text-xs sm:text-sm font-medium">Carregando documentação OpenAPI autenticada...</p>
                </div>
              )}

              {/* Mensagem de erro */}
              {error && !schemaData && (
                <div className="py-16 text-center space-y-3">
                  <AlertCircle className="size-8 text-destructive mx-auto" />
                  <p className="text-xs sm:text-sm font-semibold text-destructive">{error}</p>
                  <Button size="sm" variant="outline" onClick={() => loadData(true)}>
                    Tentar Novamente
                  </Button>
                </div>
              )}

              {/* Container persistente do Swagger UI: NUNCA destruído pelo ciclo de vida das abas */}
              <div
                className={`swagger-ui-custom-theme min-h-[450px] ${
                  (!schemaData && (loading || error)) ? 'hidden' : 'block'
                }`}
              >
                <div ref={swaggerContainerRef} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Aba 2: Exemplos de Código */}
        <TabsContent value="snippets" forceMount className="space-y-4 data-[state=inactive]:hidden">
          <Card className="border-border/60">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Terminal className="size-4 text-primary shrink-0" />
                    <span>Exemplos Prontos para Uso</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Códigos pré-configurados com a URL base e o token de autenticação ativo.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={selectedLanguage === 'curl' ? 'default' : 'outline'}
                    onClick={() => setSelectedLanguage('curl')}
                    className="h-6 sm:h-7 text-[11px] sm:text-xs px-2 sm:px-2.5"
                  >
                    cURL
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedLanguage === 'javascript' ? 'default' : 'outline'}
                    onClick={() => setSelectedLanguage('javascript')}
                    className="h-6 sm:h-7 text-[11px] sm:text-xs px-2 sm:px-2.5"
                  >
                    JavaScript
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedLanguage === 'python' ? 'default' : 'outline'}
                    onClick={() => setSelectedLanguage('python')}
                    className="h-6 sm:h-7 text-[11px] sm:text-xs px-2 sm:px-2.5"
                  >
                    Python
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 space-y-3">
              <div className="relative">
                <pre className="p-3 sm:p-4 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-[11px] sm:text-xs overflow-x-auto border border-zinc-800 leading-relaxed custom-scrollbar">
                  {getCodeSnippet()}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyText(getCodeSnippet(), 'codeSnippet')}
                  className="absolute top-2 right-2 h-6 px-2 text-[11px] gap-1 opacity-90 hover:opacity-100"
                >
                  {copiedField === 'codeSnippet' ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedField === 'codeSnippet' ? 'Copiado' : 'Copiar'}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 pt-1">
                <div className="p-2.5 sm:p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary shrink-0" />
                    Headers Obrigatórios
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Sempre envie <code>Authorization: Bearer &lt;chave&gt;</code> e <code>Content-Type: application/json</code>.
                  </p>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary shrink-0" />
                    Método HTTP
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Todas as ferramentas utilizam <code>POST</code> com payload JSON no corpo da requisição.
                  </p>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary shrink-0" />
                    Rate Limit
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Cada chave possui limite de requisições por hora configurável no painel com cabeçalhos de controle.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 3: Escopos & Permissões */}
        <TabsContent value="scopes" forceMount className="space-y-4 data-[state=inactive]:hidden">
          <Card className="border-border/60">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Key className="size-4 text-primary shrink-0" />
                <span>Matriz de Escopos da API</span>
              </CardTitle>
              <CardDescription className="text-xs">
                As chaves de API podem ser configuradas com permissões restritas para maior segurança.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              <div className="border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
                {(mcpStatus?.availableScopes || [
                  { id: 'orders:read', label: 'Consultar Pedidos', description: 'Leitura de pedidos, status de produção e resumo diário.', requiresAdmin: false },
                  { id: 'orders:create', label: 'Criar Pedidos', description: 'Criação de novos pedidos de clientes diretamente na fila.', requiresAdmin: false },
                  { id: 'orders:update', label: 'Atualizar Pedidos', description: 'Modificação de dados, itens e observações de pedidos existentes.', requiresAdmin: false },
                  { id: 'customers:read', label: 'Consultar Clientes', description: 'Busca por clientes, contatos de WhatsApp e histórico.', requiresAdmin: false },
                  { id: 'pricing:estimate', label: 'Calcular Precificação', description: 'Cálculo de custos de insumos, margem e preço sugerido.', requiresAdmin: false },
                  { id: 'financial:read', label: 'Resumo Financeiro', description: 'Leitura de faturamento, ticket médio e fluxo financeiro.', requiresAdmin: true },
                ]).map((scope) => (
                  <div key={scope.id} className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-muted/20 transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-bold text-primary font-mono">{scope.id}</code>
                        {scope.requiresAdmin && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">{scope.description}</p>
                    </div>
                    <span className="text-xs font-medium text-foreground shrink-0">{scope.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ApiDocs;
