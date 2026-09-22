/**
 * Image attach helpers for drag/drop and clipboard paste.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  imageFileFromTransfer,
  imageUrlFromTransfer,
  isLikelyImageFile,
  transferMayContainImage,
  type TransferLike,
} from './image';

function pngFile(name = 'pack.png'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
}

describe('isLikelyImageFile', () => {
  it('accepts image MIME types', () => {
    assert.equal(isLikelyImageFile(pngFile()), true);
    assert.equal(
      isLikelyImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' })),
      true
    );
  });

  it('accepts empty type when the name looks like an image', () => {
    assert.equal(
      isLikelyImageFile(new File(['x'], 'label.WEBP', { type: '' })),
      true
    );
  });

  it('rejects non-images', () => {
    assert.equal(
      isLikelyImageFile(new File(['x'], 'notes.pdf', { type: 'application/pdf' })),
      false
    );
    assert.equal(
      isLikelyImageFile(new File(['x'], 'notes.txt', { type: '' })),
      false
    );
  });
});

describe('imageFileFromTransfer', () => {
  it('picks the first image file', () => {
    const img = pngFile();
    const dt: TransferLike = {
      files: [new File(['x'], 'a.pdf', { type: 'application/pdf' }), img],
    };
    assert.equal(imageFileFromTransfer(dt), img);
  });

  it('reads clipboard items when files is empty (Gemini-style paste)', () => {
    const img = pngFile('clipboard.png');
    const dt: TransferLike = {
      files: [],
      items: [
        {
          kind: 'file',
          type: 'image/png',
          getAsFile: () => img,
        },
      ],
    };
    assert.equal(imageFileFromTransfer(dt), img);
  });

  it('ignores HTML/text clipboard (so product-name paste still works)', () => {
    const dt: TransferLike = {
      files: [],
      items: [
        {
          kind: 'string',
          type: 'text/html',
          getAsFile: () => null,
        },
      ],
      getData: (format) =>
        format === 'text/html'
          ? '<img src="https://example.com/x.png">'
          : 'snack brand',
    };
    assert.equal(imageFileFromTransfer(dt), null);
  });
});

describe('transferMayContainImage / imageUrlFromTransfer', () => {
  it('treats Files and uri-list as a possible image drop', () => {
    assert.equal(transferMayContainImage({ types: ['Files'] }), true);
    assert.equal(
      transferMayContainImage({ types: ['text/uri-list', 'text/html'] }),
      true
    );
    assert.equal(
      transferMayContainImage({ types: ['text/plain', 'text/html'] }),
      false
    );
  });

  it('reads an image URL from uri-list or html img', () => {
    assert.equal(
      imageUrlFromTransfer({
        getData: (format) =>
          format === 'text/uri-list' ? 'https://cdn.example/pack.jpg' : '',
      }),
      'https://cdn.example/pack.jpg'
    );
    assert.equal(
      imageUrlFromTransfer({
        getData: (format) =>
          format === 'text/html'
            ? '<div><img alt="x" src="https://cdn.example/n.png"></div>'
            : '',
      }),
      'https://cdn.example/n.png'
    );
  });
});
