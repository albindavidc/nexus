import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);


  transform(value: string | null | undefined, searchQuery?: string, isActive = false): SafeHtml {
    if (!value) return '';
    let parsedHtml = marked.parse(value) as string;
    
    if (searchQuery && searchQuery.trim() !== '') {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const regex = new RegExp(`(?![^<]*>)(${escapedQuery})`, 'gi');
      const highlightClass = isActive ? 'search-highlight active' : 'search-highlight passive';
      parsedHtml = parsedHtml.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
    }
    
    const cleanHTML = DOMPurify.sanitize(parsedHtml);
    return this.sanitizer.bypassSecurityTrustHtml(cleanHTML);
  }
}
