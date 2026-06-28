"use client";

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-markdown-preview/markdown.css";

async function loadPdfLibraries() {
  const [html2canvasModule, jsPDFModule] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  return {
    html2canvas: html2canvasModule.default,
    jsPDF: jsPDFModule.jsPDF,
  };
}

function applyPrintStyles(root) {
  root.querySelectorAll("*").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (["SVG", "PATH", "RECT", "CIRCLE", "LINE"].includes(node.tagName)) return;

    node.style.setProperty("color", "#000000", "important");
    node.style.setProperty("background-color", "transparent", "important");
    node.style.setProperty("-webkit-text-fill-color", "#000000", "important");
  });
}

function waitForMarkdownContent(container, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    const check = (attempt) => {
      const markdown = container.querySelector(".wmde-markdown");
      if (markdown?.textContent?.trim()) {
        resolve(markdown);
        return;
      }

      if (attempt >= maxAttempts) {
        reject(new Error("Resume content failed to render for PDF export"));
        return;
      }

      setTimeout(() => check(attempt + 1), 100);
    };

    check(0);
  });
}

function isCanvasBlank(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
      return false;
    }
  }

  return true;
}

function markdownToPlainText(markdown) {
  return markdown
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~|`)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function prepareCaptureNode(source) {
  const node = source.cloneNode(true);
  node.setAttribute("data-color-mode", "light");
  Object.assign(node.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "794px",
    padding: "40px",
    margin: "0",
    backgroundColor: "#ffffff",
    color: "#000000",
    zIndex: "999999",
    visibility: "visible",
    opacity: "1",
    fontFamily: "Arial, Helvetica, sans-serif",
  });
  applyPrintStyles(node);
  document.body.appendChild(node);
  return node;
}

async function saveTextPdf(content) {
  const text = markdownToPlainText(content);
  if (!text) {
    throw new Error("No text content available for PDF export");
  }

  const { jsPDF } = await loadPdfLibraries();
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 15;
  const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const lines = pdf.splitTextToSize(text, maxWidth);
  let y = margin;

  lines.forEach((line) => {
    if (y > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += 7;
  });

  pdf.save("resume.pdf");
}

async function saveCanvasPdf(element) {
  const { html2canvas, jsPDF } = await loadPdfLibraries();

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    width: element.scrollWidth,
    height: element.scrollHeight,
  });

  if (isCanvasBlank(canvas)) {
    throw new Error("PDF export produced a blank image");
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const imgWidth = printableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/png");

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= printableHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;
  }

  pdf.save("resume.pdf");
}

function mountResumeForExport(content) {
  const container = document.createElement("div");
  container.setAttribute("data-color-mode", "light");
  Object.assign(container.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "794px",
    padding: "40px",
    backgroundColor: "#ffffff",
    color: "#000000",
    zIndex: "999999",
    fontFamily: "Arial, Helvetica, sans-serif",
  });
  document.body.appendChild(container);

  const root = createRoot(container);

  flushSync(() => {
    root.render(
      <MDEditor.Markdown
        source={content}
        style={{ backgroundColor: "#ffffff", color: "#000000" }}
      />
    );
  });

  return { container, root };
}

function getVisiblePreviewElement() {
  return document.querySelector(".w-md-editor-preview .wmde-markdown");
}

async function captureFromElement(element) {
  const captureNode = prepareCaptureNode(element);

  try {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );
    await saveCanvasPdf(captureNode);
  } finally {
    captureNode.remove();
  }
}

async function captureFromMountedContent(content) {
  let container = null;
  let root = null;

  try {
    ({ container, root } = mountResumeForExport(content));
    const markdownElement = await waitForMarkdownContent(container);
    await captureFromElement(markdownElement);
  } finally {
    root?.unmount();
    container?.remove();
  }
}

export async function exportResumePdf(content) {
  const visiblePreview = getVisiblePreviewElement();

  try {
    if (visiblePreview?.textContent?.trim()) {
      await captureFromElement(visiblePreview);
      return;
    }

    await captureFromMountedContent(content);
  } catch (error) {
    console.warn("Visual PDF export failed, falling back to text PDF:", error);
    await saveTextPdf(content);
  }
}
