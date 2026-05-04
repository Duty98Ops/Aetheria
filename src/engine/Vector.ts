/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Vector {
  constructor(public x: number, public y: number) {}
  add(v: Vector) { this.x += v.x; this.y += v.y; return this; }
  multiply(s: number) { this.x *= s; this.y *= s; return this; }
  clone() { return new Vector(this.x, this.y); }
  static dist(v1: Vector, v2: Vector) {
    return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
  }
}
