/*
MIT License

Copyright (c) 2020 TheDavidDelta

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

Object.prototype.let = function (this, block) {
	return block(this);
};

Object.prototype.also = function (this, block) {
	block(this);
	return this;
};

Object.prototype.run = function (this, block) {
	return block.call(this);
};

Object.prototype.apply = function (this, block) {
	block.call(this);
	return this;
};

Object.prototype.takeIf = function (this, predicate) {
	return predicate(this) ? this : undefined;
};

Object.prototype.takeUnless = function (this, predicate) {
	return predicate(this) ? undefined : this;
};

Number.prototype.let = function (this, block) {
	return block(this.valueOf());
};

Number.prototype.also = function (this, block) {
	block(this.valueOf());
	return this.valueOf();
};

Number.prototype.run = function (this, block) {
	return block.call(this.valueOf());
};

Number.prototype.apply = function (this, block) {
	block.call(this.valueOf());
	return this.valueOf();
};

Number.prototype.takeIf = function (this, predicate) {
	return predicate(this.valueOf()) ? this.valueOf() : undefined;
};

Number.prototype.takeUnless = function (this, predicate) {
	return predicate(this.valueOf()) ? undefined : this.valueOf();
};

String.prototype.let = function (this, block) {
	return block(this.valueOf());
};

String.prototype.also = function (this, block) {
	block(this.valueOf());
	return this.valueOf();
};

String.prototype.run = function (this, block) {
	return block.call(this.valueOf());
};

String.prototype.apply = function (this, block) {
	block.call(this.valueOf());
	return this.valueOf();
};

String.prototype.takeIf = function (this, predicate) {
	return predicate(this.valueOf()) ? this.valueOf() : undefined;
};

String.prototype.takeUnless = function (this, predicate) {
	return predicate(this.valueOf()) ? undefined : this.valueOf();
};

Boolean.prototype.let = function (this, block) {
	return block(this.valueOf());
};

Boolean.prototype.also = function (this, block) {
	block(this.valueOf());
	return this.valueOf();
};

Boolean.prototype.run = function (this, block) {
	return block.call(this.valueOf());
};

Boolean.prototype.apply = function (this, block) {
	block.call(this.valueOf());
	return this.valueOf();
};

Boolean.prototype.takeIf = function (this, predicate) {
	return (predicate && predicate(this.valueOf())) || this.valueOf()
		? this.valueOf()
		: undefined;
};

Boolean.prototype.takeUnless = function (this, predicate) {
	return (predicate && predicate(this.valueOf())) || this.valueOf()
		? undefined
		: this.valueOf();
};

export { }
