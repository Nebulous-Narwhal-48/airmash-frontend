const PI_X2 = 2 * Math.PI;
const COLLISIONS_OBJECT_TYPES = {
  FLAGZONE: 1,
  FLAG: 2,
  SHIELD: 3,
  PROJECTILE: 4,
  INFERNO: 5,
  UPGRADE: 6,
  MOUNTAIN: 7,
  REPEL: 8,
  PLAYER: 9,
  VIEWPORT: 10,
  FIREWALL: 11,
};

export function isPlayerCollide(player, mob) {
  let hasCollision = false;

  if (
    !mob ||
    player.hitbox.x >= mob.hitbox.x + mob.hitbox.width ||
    player.hitbox.x + player.hitbox.width <= mob.hitbox.x ||
    player.hitbox.y >= mob.hitbox.y + mob.hitbox.height ||
    player.hitbox.y + player.hitbox.height <= mob.hitbox.y
  ) {
    return hasCollision;
  }

  if (mob.hitbox.body.type !== COLLISIONS_OBJECT_TYPES.FLAGZONE) {
    for (let i = mob.hitcircles.length - 1; i !== -1; i -= 1) {
      if (hasCollision) {
        break;
      }

      const mobX =
        mob.position.x +
        mob.hitcircles[i][0] * mob.rotation.cos -
        mob.hitcircles[i][1] * mob.rotation.sin;
      const mobY =
        mob.position.y +
        mob.hitcircles[i][0] * mob.rotation.sin +
        mob.hitcircles[i][1] * mob.rotation.cos;
      const mobR = mob.hitcircles[i][2];

      /**
       * TODO: optimization is needed, cache the values.
       */
      for (let j = player.hitcircles.length - 1; j !== -1; j -= 1) {
        const playerX =
          player.position.x +
          player.hitcircles[j][0] * player.rotation.cos -
          player.hitcircles[j][1] * player.rotation.sin;
        const playerY =
          player.position.y +
          player.hitcircles[j][0] * player.rotation.sin +
          player.hitcircles[j][1] * player.rotation.cos;
        const playerR = player.hitcircles[j][2];

        const distSq = (playerX - mobX) * (playerX - mobX) + (playerY - mobY) * (playerY - mobY);
        const radSumSq = (playerR + mobR) * (playerR + mobR);

        if (distSq < radSumSq) {
          hasCollision = true;
          break;
        }
      }
    }
  } else {
    for (let i = player.hitcircles.length - 1; i !== -1; i -= 1) {
      const playerX =
        player.position.x +
        player.hitcircles[i][0] * player.rotation.cos -
        player.hitcircles[i][1] * player.rotation.sin;
      const playerY =
        player.position.y +
        player.hitcircles[i][0] * player.rotation.sin +
        player.hitcircles[i][1] * player.rotation.cos;
      const playerR = player.hitcircles[i][2];

      const distX = Math.abs(playerX - mob.position.x);
      const distY = Math.abs(playerY - mob.position.y);

      if (distX < mob.hitbox.width / 2 + playerR && distY < mob.hitbox.height / 2 + playerR) {
        if (distX <= mob.hitbox.width / 2 || distY <= mob.hitbox.height / 2) {
          hasCollision = true;
          break;
        }

        const dx = distX - mob.hitbox.width / 2;
        const dy = distY - mob.hitbox.height / 2;

        if (dx * dx + dy * dy <= playerR * playerR) {
          hasCollision = true;
          break;
        }
      }
    }
  }

  return hasCollision;
}

export function isProjectileCollide(projectile, mountain) {
  let hasCollision = false;

  if (
    projectile.hitbox.x >= mountain.hitbox.x + mountain.hitbox.width ||
    projectile.hitbox.x + projectile.hitbox.width <= mountain.hitbox.x ||
    projectile.hitbox.y >= mountain.hitbox.y + mountain.hitbox.height ||
    projectile.hitbox.y + projectile.hitbox.height <= mountain.hitbox.y
  ) {
    return hasCollision;
  }

  /**
   * Check only forward projectile hitcircle (index 0).
   */
  const mountainR = mountain.hitcircles[0][2];

  const projectileX =
    projectile.position.x +
    projectile.hitcircles[0][0] * projectile.rotation.cos -
    projectile.hitcircles[0][1] * projectile.rotation.sin;

  const projectileY =
    projectile.position.y +
    projectile.hitcircles[0][0] * projectile.rotation.sin +
    projectile.hitcircles[0][1] * projectile.rotation.cos;

  const projectileR = projectile.hitcircles[0][2];

  const distSq =
    (projectileX - mountain.position.x) * (projectileX - mountain.position.x) +
    (projectileY - mountain.position.y) * (projectileY - mountain.position.y);
  const radSumSq = (projectileR + mountainR) * (projectileR + mountainR);

  if (distSq < radSumSq) {
    hasCollision = true;
  }

  return hasCollision;
} 

export function isRepelCollide(repel, mob) {
    let hasCollision = false;

    if (
      !mob ||
      repel.hitbox.x >= mob.hitbox.x + mob.hitbox.width ||
      repel.hitbox.x + repel.hitbox.width <= mob.hitbox.x ||
      repel.hitbox.y >= mob.hitbox.y + mob.hitbox.height ||
      repel.hitbox.y + repel.hitbox.height <= mob.hitbox.y
    ) {
      return hasCollision;
    }

    for (let i = mob.hitcircles.length - 1; i !== -1; i -= 1) {
      if (hasCollision) {
        break;
      }

      const mobX =
        mob.position.x +
        mob.hitcircles[i][0] * mob.rotation.cos -
        mob.hitcircles[i][1] * mob.rotation.sin;
      const mobY =
        mob.position.y +
        mob.hitcircles[i][0] * mob.rotation.sin +
        mob.hitcircles[i][1] * mob.rotation.cos;
      const mobR = mob.hitcircles[i][2];

      /**
       * TODO: optimization is needed, cache the values.
       */
      for (let j = repel.hitcircles.length - 1; j !== -1; j -= 1) {
        const repelX =
          repel.position.x +
          repel.hitcircles[j][0] * repel.rotation.cos -
          repel.hitcircles[j][1] * repel.rotation.sin;
        const repelY =
          repel.position.y +
          repel.hitcircles[j][0] * repel.rotation.sin +
          repel.hitcircles[j][1] * repel.rotation.cos;
        const repelR = repel.hitcircles[j][2];

        const distSq = (repelX - mobX) * (repelX - mobX) + (repelY - mobY) * (repelY - mobY);
        const radSumSq = (repelR + mobR) * (repelR + mobR);

        if (distSq < radSumSq) {
          hasCollision = true;
          break;
        }
      }
    }

    return hasCollision;
}

export function getHitboxCache(collisions) {
  let calculated = {};
  let rot = 0;

  while (rot <= PI_X2) {
    let hashRot = 0;
    let calcRot = 0;

    if (Math.floor(rot * 1000) / 1000 !== rot) {
      hashRot = Math.ceil(rot * 1000) / 1000;
      calcRot = Math.ceil(rot * 1000) / 1000;
    } else {
      hashRot = Math.floor(rot * 1000) / 1000;
      calcRot = Math.floor(rot * 1000) / 1000;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let ci = 0; ci < collisions.length; ci += 1) {
      const [hitCircleX, hitCircleY, hitCircleR] = collisions[ci];
      const x = hitCircleX * Math.cos(calcRot) - hitCircleY * Math.sin(calcRot);
      const y = hitCircleX * Math.sin(calcRot) + hitCircleY * Math.cos(calcRot);

      if (minX > x - hitCircleR) {
        minX = x - hitCircleR;
      }

      if (maxX < x + hitCircleR) {
        maxX = x + hitCircleR;
      }

      if (minY > y - hitCircleR) {
        minY = y - hitCircleR;
      }

      if (maxY < y + hitCircleR) {
        maxY = y + hitCircleR;
      }
    }

    let width = ~~(Math.abs(minX) + Math.abs(maxX) + 0.5);
    let height = ~~(Math.abs(minY) + Math.abs(maxY) + 0.5);

    if (width % 2 !== 0) {
      width += 1;
    }

    if (height % 2 !== 0) {
      height += 1;
    }

    const x = -width / 2;
    const y = -height / 2;

    if (collisions.length === 1) {
      calculated = { width, height, x, y };
      break;
    } else {
      calculated[hashRot] = { width, height, x, y };
    }

    if ((Math.floor(rot * 1000) + 1) / 1000 === rot) {
      rot = (Math.ceil(rot * 1000) + 1) / 1000;
    } else {
      rot = (Math.floor(rot * 1000) + 1) / 1000;
    }

    if (rot > PI_X2) {
      break;
    }
  }

  return calculated;
}


/**
 * A collision system used to track bodies in order to improve collision detection performance
 * @class
 */
export class Collisions {
	/**
	 * @constructor
	 */
	constructor() {
		/** @private */
		this._bvh = new BVH();
	}

	/**
	 * Inserts bodies into the collision system
	 * @param {...Circle|...Polygon|...Point} bodies
	 */
	insert(...bodies) {
		for (let index = 0; index < bodies.length; index += 1) {
			this._bvh.insert(bodies[index], false);
		}

		return this;
	}

	/**
	 * Removes bodies from the collision system
	 * @param {...Circle|...Polygon|...Point} bodies
	 */
	remove(...bodies) {
		for (let index = 0; index < bodies.length; index += 1) {
			this._bvh.remove(bodies[index], false);
		}

		return this;
	}

	/**
	 * Updates the collision system. This should be called before any collisions are tested.
	 */
	update() {
		this._bvh.update();

		return this;
	}

	/**
	 * Draws the bodies within the system to a CanvasRenderingContext2D's current path
	 * @param {CanvasRenderingContext2D} context The context to draw to
	 */
	draw(context) {
		return this._bvh.draw(context);
	}

	/**
	 * Draws the system's BVH to a CanvasRenderingContext2D's current path. This is useful for testing out different padding values for bodies.
	 * @param {CanvasRenderingContext2D} context The context to draw to
	 */
	drawBVH(context) {
		return this._bvh.drawBVH(context);
	}

	/**
	 * Returns a list of potential collisions for a body
	 * @param {Circle|Polygon|Point} body The body to test for potential collisions against
	 * @returns {Array<Body>}
	 */
	potentials(body) {
		return this._bvh.potentials(body);
	}

	/**
	 * Determines if two bodies are colliding
	 * @param {Circle|Polygon|Point} target The target body to test against
	 * @param {Result} [result = null] A Result object on which to store information about the collision
	 * @param {Boolean} [aabb = true] Set to false to skip the AABB test (useful if you use your own potential collision heuristic)
	 * @returns {Boolean}
	 */
	collides(source, target, result = null, aabb = true) {
		return SAT(source, target, result, aabb);
	}
};

class Body {
  /**
   * @constructor
   * @param {Number} [x = 0] The starting X coordinate
   * @param {Number} [y = 0] The starting Y coordinate
   * @param {Number} [padding = 0] The amount to pad the bounding volume when testing for potential collisions
   */
  constructor(x = 0, y = 0, padding = 0) {
    /**
     * @desc The X coordinate of the body
     * @type {Number}
     */
    this.x = x;

    /**
     * @desc The Y coordinate of the body
     * @type {Number}
     */
    this.y = y;

    /**
     * @desc The amount to pad the bounding volume when testing for potential collisions
     * @type {Number}
     */
    this.padding = padding;

    /** @private */
    this._circle = false;

    /** @private */
    this._polygon = false;

    /** @private */
    this._point = false;

    /** @private */
    this._bvh = null;

    /** @private */
    this._bvh_parent = null;

    /** @private */
    this._bvh_branch = false;

    /** @private */
    this._bvh_padding = padding;

    /** @private */
    this._bvh_min_x = 0;

    /** @private */
    this._bvh_min_y = 0;

    /** @private */
    this._bvh_max_x = 0;

    /** @private */
    this._bvh_max_y = 0;

    this.id = null;
    this.type = null;

    /**
     * Team ID if required.
     */
    this.team = null;

    /**
     * Should be included in the viewport potential collisions list.
     */
    this.isCollideWithViewport = false;

    /**
     * Should be included in the player potential collisions list.
     */
    this.isCollideWithPlayer = false;

    /**
     * Should be included in the projectile potential collisions list.
     */
    this.isCollideWithProjectile = false;

     /**
     * Should be included in the repel potential collisions list.
     */
    this.isCollideWithRepel = false;

     /**
     * Is a box (shield, inferno or upgrade).
     */
    this.isBox = false;

    /**
     * Is a projectile.
     */
    this.isProjectile = false;
  }

  /**
   * Determines if the body is colliding with another body
   * @param {Circle|Polygon|Point} target The target body to test against
   * @param {Result} [result = null] A Result object on which to store information about the collision
   * @param {Boolean} [aabb = true] Set to false to skip the AABB test (useful if you use your own potential collision heuristic)
   * @returns {Boolean}
   */
  collides(target, result = null, aabb = true) {
    return SAT(this, target, result, aabb);
  }

  /**
   * Returns a list of potential collisions
   * @returns {Array<Body>}
   */
  potentials() {
    const bvh = this._bvh;

    if(bvh === null) {
      throw new Error('Body does not belong to a collision system');
    }

    return bvh.potentials(this);
  }

  viewportPotentials() {
    const bvh = this._bvh;

    if(bvh === null) {
      throw new Error('Body does not belong to a collision system');
    }

    return bvh.viewportPotentials(this);
  }

  repelPotentials() {
    const bvh = this._bvh;

    if(bvh === null) {
      throw new Error('Body does not belong to a collision system');
    }

    return bvh.repelPotentials(this);
  }

  playerPotentials() {
    const bvh = this._bvh;

    if(bvh === null) {
      throw new Error('Body does not belong to a collision system');
    }

    return bvh.playerPotentials(this);
  }

  projectilePotentials() {
    const bvh = this._bvh;

    if(bvh === null) {
      throw new Error('Body does not belong to a collision system');
    }

    return bvh.projectilePotentials(this);
  }

  /**
   * Removes the body from its current collision system
   */
  remove() {
    const bvh = this._bvh;

    if(bvh) {
      bvh.remove(this, false);
    }
  }

  /**
   * Creates a {@link Result} used to collect the detailed results of a collision test
   */
  createResult() {
    return new Result();
  }

  /**
   * Creates a Result used to collect the detailed results of a collision test
   */
  static createResult() {
    return new Result();
  }
};


export class Circle extends Body {
	/**
	 * @constructor
	 * @param {Number} [x = 0] The starting X coordinate
	 * @param {Number} [y = 0] The starting Y coordinate
	 * @param {Number} [radius = 0] The radius
	 * @param {Number} [scale = 1] The scale
	 * @param {Number} [padding = 0] The amount to pad the bounding volume when testing for potential collisions
	 */
	constructor(x = 0, y = 0, radius = 0, scale = 1, padding = 0) {
		super(x, y, padding);

		/**
		 * @desc
		 * @type {Number}
		 */
		this.radius = radius;

		/**
		 * @desc
		 * @type {Number}
		 */
		this.scale = scale;
	}

	/**
	 * Draws the circle to a CanvasRenderingContext2D's current path
	 * @param {CanvasRenderingContext2D} context The context to add the arc to
	 */
	draw(context) {
		const x      = this.x;
		const y      = this.y;
		const radius = this.radius * this.scale;

		context.moveTo(x + radius, y);
		context.arc(x, y, radius, 0, Math.PI * 2);
	}
};

export class Polygon extends Body {
	/**
	 * @constructor
	 * @param {Number} [x = 0] The starting X coordinate
	 * @param {Number} [y = 0] The starting Y coordinate
	 * @param {Array<Number[]>} [points = []] An array of coordinate pairs making up the polygon - [[x1, y1], [x2, y2], ...]
	 * @param {Number} [angle = 0] The starting rotation in radians
	 * @param {Number} [scale_x = 1] The starting scale along the X axis
	 * @param {Number} [scale_y = 1] The starting scale long the Y axis
	 * @param {Number} [padding = 0] The amount to pad the bounding volume when testing for potential collisions
	 */
	constructor(x = 0, y = 0, points = [], angle = 0, scale_x = 1, scale_y = 1, padding = 0) {
		super(x, y, padding);

		/**
		 * @desc The angle of the body in radians
		 * @type {Number}
		 */
		this.angle = angle;

		/**
		 * @desc The scale of the body along the X axis
		 * @type {Number}
		 */
		this.scale_x = scale_x;

		/**
		 * @desc The scale of the body along the Y axis
		 * @type {Number}
		 */
		this.scale_y = scale_y;


		/** @private */
		this._polygon = true;

		/** @private */
		this._x = x;

		/** @private */
		this._y = y;

		/** @private */
		this._angle = angle;

		/** @private */
		this._scale_x = scale_x;

		/** @private */
		this._scale_y = scale_y;

		/** @private */
		this._min_x = 0;

		/** @private */
		this._min_y = 0;

		/** @private */
		this._max_x = 0;

		/** @private */
		this._max_y = 0;

		/** @private */
		this._points = null;

		/** @private */
		this._coords = null;

		/** @private */
		this._edges = null;

		/** @private */
		this._normals = null;

		/** @private */
		this._dirty_coords = true;

		/** @private */
		this._dirty_normals = true;

		Polygon.prototype.setPoints.call(this, points);
	}

	/**
	 * Draws the polygon to a CanvasRenderingContext2D's current path
	 * @param {CanvasRenderingContext2D} context The context to add the shape to
	 */
	draw(context) {
		if(
			this._dirty_coords ||
			this.x       !== this._x ||
			this.y       !== this._y ||
			this.angle   !== this._angle ||
			this.scale_x !== this._scale_x ||
			this.scale_y !== this._scale_y
		) {
			this._calculateCoords();
		}

		const coords = this._coords;

		if(coords.length === 2) {
			context.moveTo(coords[0], coords[1]);
			context.arc(coords[0], coords[1], 1, 0, Math.PI * 2);
		}
		else {
			context.moveTo(coords[0], coords[1]);

			for(let i = 2; i < coords.length; i += 2) {
				context.lineTo(coords[i], coords[i + 1]);
			}

			if(coords.length > 4) {
				context.lineTo(coords[0], coords[1]);
			}
		}
	}

	/**
	 * Sets the points making up the polygon. It's important to use this function when changing the polygon's shape to ensure internal data is also updated.
	 * @param {Array<Number[]>} new_points An array of coordinate pairs making up the polygon - [[x1, y1], [x2, y2], ...]
	 */
	setPoints(new_points) {
		const count = new_points.length;

		this._points  = new Float64Array(count * 2);
		this._coords  = new Float64Array(count * 2);
		this._edges   = new Float64Array(count * 2);
		this._normals = new Float64Array(count * 2);

		const points = this._points;

		for(let i = 0, ix = 0, iy = 1; i < count; ++i, ix += 2, iy += 2) {
			const new_point = new_points[i];

			points[ix] = new_point[0];
			points[iy] = new_point[1];
		}

		this._dirty_coords = true;
	}

	/**
	 * Calculates and caches the polygon's world coordinates based on its points, angle, and scale
	 */
	_calculateCoords() {
		const x       = this.x;
		const y       = this.y;
		const angle   = this.angle;
		const scale_x = this.scale_x;
		const scale_y = this.scale_y;
		const points  = this._points;
		const coords  = this._coords;
		const count   = points.length;

		let min_x;
		let max_x;
		let min_y;
		let max_y;

		for(let ix = 0, iy = 1; ix < count; ix += 2, iy += 2) {
			let coord_x = points[ix] * scale_x;
			let coord_y = points[iy] * scale_y;

			if(angle) {
				const cos   = Math.cos(angle);
				const sin   = Math.sin(angle);
				const tmp_x = coord_x;
				const tmp_y = coord_y;

				coord_x = tmp_x * cos - tmp_y * sin;
				coord_y = tmp_x * sin + tmp_y * cos;
			}

			coord_x += x;
			coord_y += y;

			coords[ix] = coord_x;
			coords[iy] = coord_y;

			if(ix === 0) {
				min_x = max_x = coord_x;
				min_y = max_y = coord_y;
			}
			else {
				if(coord_x < min_x) {
					min_x = coord_x;
				}
				else if(coord_x > max_x) {
					max_x = coord_x;
				}

				if(coord_y < min_y) {
					min_y = coord_y;
				}
				else if(coord_y > max_y) {
					max_y = coord_y;
				}
			}
		}

		this._x             = x;
		this._y             = y;
		this._angle         = angle;
		this._scale_x       = scale_x;
		this._scale_y       = scale_y;
		this._min_x         = min_x;
		this._min_y         = min_y;
		this._max_x         = max_x;
		this._max_y         = max_y;
		this._dirty_coords  = false;
		this._dirty_normals = true;
	}

	/**
	 * Calculates the normals and edges of the polygon's sides
	 */
	_calculateNormals() {
		const coords  = this._coords;
		const edges   = this._edges;
		const normals = this._normals;
		const count   = coords.length;

		for(let ix = 0, iy = 1; ix < count; ix += 2, iy += 2) {
			const next   = ix + 2 < count ? ix + 2 : 0;
			const x      = coords[next] - coords[ix];
			const y      = coords[next + 1] - coords[iy];
			const length = x || y ? Math.sqrt(x * x + y * y) : 0;

			edges[ix]   = x;
			edges[iy]   = y;
			normals[ix] = length ? y / length : 0;
			normals[iy] = length ? -x / length : 0;
		}

		this._dirty_normals = false;
	}
};
/**
 * @private
 */
const branch_pool = [];


class BVHBranch {
	/**
	 * @constructor
	 */
	constructor() {
		/** @private */
		this._bvh_parent = null;

		/** @private */
		this._bvh_branch = true;

		/** @private */
		this._bvh_left = null;

		/** @private */
		this._bvh_right = null;

		/** @private */
		this._bvh_sort = 0;

		/** @private */
		this._bvh_min_x = 0;

		/** @private */
		this._bvh_min_y = 0;

		/** @private */
		this._bvh_max_x = 0;

		/** @private */
		this._bvh_max_y = 0;
	}

	/**
	 * Returns a branch from the branch pool or creates a new branch
	 * @returns {BVHBranch}
	 */
	static getBranch() {
		if(branch_pool.length) {
			return branch_pool.pop();
		}

		return new BVHBranch();
	}

	/**
	 * Releases a branch back into the branch pool
	 * @param {BVHBranch} branch The branch to release
	 */
	static releaseBranch(branch) {
		branch_pool.push(branch);
	}

	/**
	 * Sorting callback used to sort branches by deepest first
	 * @param {BVHBranch} a The first branch
	 * @param {BVHBranch} b The second branch
	 * @returns {Number}
	 */
	static sortBranches(a, b) {
		return a.sort > b.sort ? -1 : 1;
	}
};

const bInsert = (array, element) => {
  let min = 0;
  let max = array.length;

  while (max - min > 0) {
    const m = ~~((min + max) / 2);

    if (array[m].type > element.type) {
      max = m;
    } else {
      min = m + 1;
    }
  }

  array.splice(max, 0, element);
}

class BVH {
  /**
   * @constructor
   */
  constructor() {
    /** @private */
    this._hierarchy = null;

    /** @private */
    this._bodies = [];

    /** @private */
    this._dirty_branches = [];

    this.maxServiceMobId = 1023;
  }

  /**
   * Inserts a body into the BVH
   * @param {Circle|Polygon|Point} body The body to insert
   * @param {Boolean} [updating = false] Set to true if the body already exists in the BVH (used internally when updating the body's position)
   */
  insert(body, updating = false) {
    if(!updating) {
      const bvh = body._bvh;

      if(bvh && bvh !== this) {
        throw new Error('Body belongs to another collision system');
      }

      body._bvh = this;
      this._bodies.push(body);
    }

    const polygon = body._polygon;
    const body_x  = body.x;
    const body_y  = body.y;

    if(polygon) {
      if(
        body._dirty_coords ||
        body.x       !== body._x ||
        body.y       !== body._y ||
        body.angle   !== body._angle ||
        body.scale_x !== body._scale_x ||
        body.scale_y !== body._scale_y
      ) {
        body._calculateCoords();
      }
    }

    const padding    = body._bvh_padding;
    const radius     = polygon ? 0 : body.radius * body.scale;
    const body_min_x = (polygon ? body._min_x : body_x - radius) - padding;
    const body_min_y = (polygon ? body._min_y : body_y - radius) - padding;
    const body_max_x = (polygon ? body._max_x : body_x + radius) + padding;
    const body_max_y = (polygon ? body._max_y : body_y + radius) + padding;

    body._bvh_min_x = body_min_x;
    body._bvh_min_y = body_min_y;
    body._bvh_max_x = body_max_x;
    body._bvh_max_y = body_max_y;

    let current = this._hierarchy;
    let sort    = 0;

    if(!current) {
      this._hierarchy = body;
    }
    else {
      while(true) {
        // Branch
        if(current._bvh_branch) {
          const left            = current._bvh_left;
          const left_min_y      = left._bvh_min_y;
          const left_max_x      = left._bvh_max_x;
          const left_max_y      = left._bvh_max_y;
          const left_new_min_x  = body_min_x < left._bvh_min_x ? body_min_x : left._bvh_min_x;
          const left_new_min_y  = body_min_y < left_min_y ? body_min_y : left_min_y;
          const left_new_max_x  = body_max_x > left_max_x ? body_max_x : left_max_x;
          const left_new_max_y  = body_max_y > left_max_y ? body_max_y : left_max_y;
          const left_volume     = (left_max_x - left._bvh_min_x) * (left_max_y - left_min_y);
          const left_new_volume = (left_new_max_x - left_new_min_x) * (left_new_max_y - left_new_min_y);
          const left_difference = left_new_volume - left_volume;

          const right            = current._bvh_right;
          const right_min_x      = right._bvh_min_x;
          const right_min_y      = right._bvh_min_y;
          const right_max_x      = right._bvh_max_x;
          const right_max_y      = right._bvh_max_y;
          const right_new_min_x  = body_min_x < right_min_x ? body_min_x : right_min_x;
          const right_new_min_y  = body_min_y < right_min_y ? body_min_y : right_min_y;
          const right_new_max_x  = body_max_x > right_max_x ? body_max_x : right_max_x;
          const right_new_max_y  = body_max_y > right_max_y ? body_max_y : right_max_y;
          const right_volume     = (right_max_x - right_min_x) * (right_max_y - right_min_y);
          const right_new_volume = (right_new_max_x - right_new_min_x) * (right_new_max_y - right_new_min_y);
          const right_difference = right_new_volume - right_volume;

          current._bvh_sort  = sort++;
          current._bvh_min_x = left_new_min_x < right_new_min_x ? left_new_min_x : right_new_min_x;
          current._bvh_min_y = left_new_min_y < right_new_min_y ? left_new_min_y : right_new_min_y;
          current._bvh_max_x = left_new_max_x > right_new_max_x ? left_new_max_x : right_new_max_x;
          current._bvh_max_y = left_new_max_y > right_new_max_y ? left_new_max_y : right_new_max_y;

          current = left_difference <= right_difference ? left : right;
        }
        // Leaf
        else {
          const grandparent  = current._bvh_parent;
          const parent_min_x = current._bvh_min_x;
          const parent_min_y = current._bvh_min_y;
          const parent_max_x = current._bvh_max_x;
          const parent_max_y = current._bvh_max_y;
          const new_parent   = current._bvh_parent = body._bvh_parent = BVHBranch.getBranch();

          new_parent._bvh_parent = grandparent;
          new_parent._bvh_left   = current;
          new_parent._bvh_right  = body;
          new_parent._bvh_sort   = sort++;
          new_parent._bvh_min_x  = body_min_x < parent_min_x ? body_min_x : parent_min_x;
          new_parent._bvh_min_y  = body_min_y < parent_min_y ? body_min_y : parent_min_y;
          new_parent._bvh_max_x  = body_max_x > parent_max_x ? body_max_x : parent_max_x;
          new_parent._bvh_max_y  = body_max_y > parent_max_y ? body_max_y : parent_max_y;

          if(!grandparent) {
            this._hierarchy = new_parent;
          }
          else if(grandparent._bvh_left === current) {
            grandparent._bvh_left = new_parent;
          }
          else {
            grandparent._bvh_right = new_parent;
          }

          break;
        }
      }
    }
  }

  /**
   * Removes a body from the BVH
   * @param {Circle|Polygon|Point} body The body to remove
   * @param {Boolean} [updating = false] Set to true if this is a temporary removal (used internally when updating the body's position)
   */
  remove(body, updating = false) {
    if(!updating) {
      const bvh = body._bvh;

      if(bvh && bvh !== this) {
        throw new Error('Body belongs to another collision system');
      }

      body._bvh = null;
      this._bodies.splice(this._bodies.indexOf(body), 1);
    }

    if(this._hierarchy === body) {
      this._hierarchy = null;

      return;
    }

    const parent       = body._bvh_parent;
    const grandparent  = parent._bvh_parent;
    const parent_left  = parent._bvh_left;
    const sibling      = parent_left === body ? parent._bvh_right : parent_left;

    sibling._bvh_parent = grandparent;

    if(sibling._bvh_branch) {
      sibling._bvh_sort = parent._bvh_sort;
    }

    if(grandparent) {
      if(grandparent._bvh_left === parent) {
        grandparent._bvh_left = sibling;
      }
      else {
        grandparent._bvh_right = sibling;
      }

      let branch = grandparent;

      while(branch) {
        const left       = branch._bvh_left;
        const left_min_x = left._bvh_min_x;
        const left_min_y = left._bvh_min_y;
        const left_max_x = left._bvh_max_x;
        const left_max_y = left._bvh_max_y;

        const right       = branch._bvh_right;
        const right_min_x = right._bvh_min_x;
        const right_min_y = right._bvh_min_y;
        const right_max_x = right._bvh_max_x;
        const right_max_y = right._bvh_max_y;

        branch._bvh_min_x = left_min_x < right_min_x ? left_min_x : right_min_x;
        branch._bvh_min_y = left_min_y < right_min_y ? left_min_y : right_min_y;
        branch._bvh_max_x = left_max_x > right_max_x ? left_max_x : right_max_x;
        branch._bvh_max_y = left_max_y > right_max_y ? left_max_y : right_max_y;

        branch = branch._bvh_parent;
      }
    }
    else {
      this._hierarchy = sibling;
    }

    BVHBranch.releaseBranch(parent);
  }

  /**
   * Updates the BVH. Moved bodies are removed/inserted.
   */
  update() {
    const bodies = this._bodies;
    const count  = bodies.length;

    for(let i = 0; i < count; ++i) {
      const body = bodies[i];

      let update = false;

      if(!update && body.padding !== body._bvh_padding) {
        body._bvh_padding = body.padding;
        update = true;
      }

      if(!update) {
        const polygon = body._polygon;

        if(polygon) {
          if(
            body._dirty_coords ||
            body.x       !== body._x ||
            body.y       !== body._y ||
            body.angle   !== body._angle ||
            body.scale_x !== body._scale_x ||
            body.scale_y !== body._scale_y
          ) {
            body._calculateCoords();
          }
        }

        const x      = body.x;
        const y      = body.y;
        const radius = polygon ? 0 : body.radius * body.scale;
        const min_x  = polygon ? body._min_x : x - radius;
        const min_y  = polygon ? body._min_y : y - radius;
        const max_x  = polygon ? body._max_x : x + radius;
        const max_y  = polygon ? body._max_y : y + radius;

        update = min_x < body._bvh_min_x || min_y < body._bvh_min_y || max_x > body._bvh_max_x || max_y > body._bvh_max_y;
      }

      if(update) {
        this.remove(body, true);
        this.insert(body, true);
      }
    }
  }

  /**
   * Returns a list of potential collisions for a body
   * @param {Circle|Polygon|Point} body The body to test
   * @returns {Array<Body>}
   */
  potentials(body) {
    const results = [];
    const min_x   = body._bvh_min_x;
    const min_y   = body._bvh_min_y;
    const max_x   = body._bvh_max_x;
    const max_y   = body._bvh_max_y;

    let current       = this._hierarchy;
    let traverse_left = true;

    if(!current || !current._bvh_branch) {
      return results;
    }

    while(current) {
      if(traverse_left) {
        traverse_left = false;

        let left = current._bvh_branch ? current._bvh_left : null;

        while(
          left &&
          left._bvh_max_x >= min_x &&
          left._bvh_max_y >= min_y &&
          left._bvh_min_x <= max_x &&
          left._bvh_min_y <= max_y
        ) {
          current = left;
          left    = current._bvh_branch ? current._bvh_left : null;
        }
      }

      const branch = current._bvh_branch;
      const right  = branch ? current._bvh_right : null;

      if(
        right &&
        right._bvh_max_x > min_x &&
        right._bvh_max_y > min_y &&
        right._bvh_min_x < max_x &&
        right._bvh_min_y < max_y
      ) {
        current       = right;
        traverse_left = true;
      }
      else {
        if(!branch && current !== body) {
          results.push(current);
        }

        let parent = current._bvh_parent;

        if(parent) {
          while(parent && parent._bvh_right === current) {
            current = parent;
            parent  = current._bvh_parent;
          }

          current = parent;
        }
        else {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Returns a list of potential collisions for a viewport
   * @param {Circle|Polygon|Point} body The body to test
   * @returns {Array<Body>}
   */
  viewportPotentials(body) {
    const results = [];
    const min_x   = body._bvh_min_x;
    const min_y   = body._bvh_min_y;
    const max_x   = body._bvh_max_x;
    const max_y   = body._bvh_max_y;

    let current       = this._hierarchy;
    let traverse_left = true;

    if(!current || !current._bvh_branch) {
      return results;
    }

    while(current) {
      if(traverse_left) {
        traverse_left = false;

        let left = current._bvh_branch ? current._bvh_left : null;

        while(
          left &&
          left._bvh_max_x >= min_x &&
          left._bvh_max_y >= min_y &&
          left._bvh_min_x <= max_x &&
          left._bvh_min_y <= max_y
        ) {
          current = left;
          left    = current._bvh_branch ? current._bvh_left : null;
        }
      }

      const branch = current._bvh_branch;
      const right  = branch ? current._bvh_right : null;

      if(
        right &&
        right._bvh_max_x > min_x &&
        right._bvh_max_y > min_y &&
        right._bvh_min_x < max_x &&
        right._bvh_min_y < max_y
      ) {
        current       = right;
        traverse_left = true;
      }
      else {
        if (
          !branch &&
          current.isCollideWithViewport &&
          current !== body &&
          current.id !== body.id
        ) {
          results.push(current);
        }

        let parent = current._bvh_parent;

        if(parent) {
          while(parent && parent._bvh_right === current) {
            current = parent;
            parent  = current._bvh_parent;
          }

          current = parent;
        }
        else {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Returns a list of potential collisions for a repel
   * @param {Circle|Polygon|Point} body The body to test
   * @returns {Array<Body>}
   */
  repelPotentials(body) {
    const results = [];
    const min_x   = body._bvh_min_x;
    const min_y   = body._bvh_min_y;
    const max_x   = body._bvh_max_x;
    const max_y   = body._bvh_max_y;

    let current       = this._hierarchy;
    let traverse_left = true;

    if(!current || !current._bvh_branch) {
      return results;
    }

    while(current) {
      if(traverse_left) {
        traverse_left = false;

        let left = current._bvh_branch ? current._bvh_left : null;

        while(
          left &&
          left._bvh_max_x >= min_x &&
          left._bvh_max_y >= min_y &&
          left._bvh_min_x <= max_x &&
          left._bvh_min_y <= max_y
        ) {
          current = left;
          left    = current._bvh_branch ? current._bvh_left : null;
        }
      }

      const branch = current._bvh_branch;
      const right  = branch ? current._bvh_right : null;

      if(
        right &&
        right._bvh_max_x > min_x &&
        right._bvh_max_y > min_y &&
        right._bvh_min_x < max_x &&
        right._bvh_min_y < max_y
      ) {
        current       = right;
        traverse_left = true;
      }
      else {
        if (
          !branch &&
          current.isCollideWithRepel &&
          current !== body &&
          current.id !== body.id &&
          current.team !== body.team
        ) {
          results.push(current);
        }

        let parent = current._bvh_parent;

        if(parent) {
          while(parent && parent._bvh_right === current) {
            current = parent;
            parent  = current._bvh_parent;
          }

          current = parent;
        }
        else {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Returns a list of potential collisions for a player
   * @param {Circle|Polygon|Point} body The body to test
   * @returns {Array<Body>}
   */
  playerPotentials(body) {
    const results = [];
    const min_x   = body._bvh_min_x;
    const min_y   = body._bvh_min_y;
    const max_x   = body._bvh_max_x;
    const max_y   = body._bvh_max_y;

    let current       = this._hierarchy;
    let traverse_left = true;

    if(!current || !current._bvh_branch) {
      return results;
    }

    while(current) {
      if(traverse_left) {
        traverse_left = false;

        let left = current._bvh_branch ? current._bvh_left : null;

        while(
          left &&
          left._bvh_max_x >= min_x &&
          left._bvh_max_y >= min_y &&
          left._bvh_min_x <= max_x &&
          left._bvh_min_y <= max_y
        ) {
          current = left;
          left    = current._bvh_branch ? current._bvh_left : null;
        }
      }

      const branch = current._bvh_branch;
      const right  = branch ? current._bvh_right : null;

      if(
        right &&
        right._bvh_max_x > min_x &&
        right._bvh_max_y > min_y &&
        right._bvh_min_x < max_x &&
        right._bvh_min_y < max_y
      ) {
        current       = right;
        traverse_left = true;
      }
      else {
        if (
          !branch &&
          current.isCollideWithPlayer &&
          current !== body &&
          current.id !== body.id &&
          current.team !== body.team
        ) {
          bInsert(results, current);
        }

        let parent = current._bvh_parent;

        if(parent) {
          while(parent && parent._bvh_right === current) {
            current = parent;
            parent  = current._bvh_parent;
          }

          current = parent;
        }
        else {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Returns a list of potential collisions for a projectile
   * @param {Circle|Polygon|Point} body The body to test
   * @returns {Array<Body>}
   */
  projectilePotentials(body) {
    const results = [];
    const min_x   = body._bvh_min_x;
    const min_y   = body._bvh_min_y;
    const max_x   = body._bvh_max_x;
    const max_y   = body._bvh_max_y;

    let current       = this._hierarchy;
    let traverse_left = true;

    if(!current || !current._bvh_branch) {
      return results;
    }

    while(current) {
      if(traverse_left) {
        traverse_left = false;

        let left = current._bvh_branch ? current._bvh_left : null;

        while(
          left &&
          left._bvh_max_x >= min_x &&
          left._bvh_max_y >= min_y &&
          left._bvh_min_x <= max_x &&
          left._bvh_min_y <= max_y
        ) {
          current = left;
          left    = current._bvh_branch ? current._bvh_left : null;
        }
      }

      const branch = current._bvh_branch;
      const right  = branch ? current._bvh_right : null;

      if(
        right &&
        right._bvh_max_x > min_x &&
        right._bvh_max_y > min_y &&
        right._bvh_min_x < max_x &&
        right._bvh_min_y < max_y
      ) {
        current       = right;
        traverse_left = true;
      }
      else {
        if (
          !branch &&
          current.isCollideWithProjectile &&
          current !== body &&
          current.id !== body.id
        ) {
          results.push(current);
        }

        let parent = current._bvh_parent;

        if(parent) {
          while(parent && parent._bvh_right === current) {
            current = parent;
            parent  = current._bvh_parent;
          }

          current = parent;
        }
        else {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Draws the bodies within the BVH to a CanvasRenderingContext2D's current path
   * @param {CanvasRenderingContext2D} context The context to draw to
   */
  draw(context) {
    const bodies = this._bodies;
    const count  = bodies.length;

    for(let i = 0; i < count; ++i) {
      bodies[i].draw(context);
    }
  }

  /**
   * Draws the BVH to a CanvasRenderingContext2D's current path. This is useful for testing out different padding values for bodies.
   * @param {CanvasRenderingContext2D} context The context to draw to
   */
  drawBVH(context) {
    let current       = this._hierarchy;
    let traverse_left = true;

    while(current) {
      if(traverse_left) {
        traverse_left = false;

        let left = current._bvh_branch ? current._bvh_left : null;

        while(left) {
          current = left;
          left    = current._bvh_branch ? current._bvh_left : null;
        }
      }

      const branch = current._bvh_branch;
      const min_x  = current._bvh_min_x;
      const min_y  = current._bvh_min_y;
      const max_x  = current._bvh_max_x;
      const max_y  = current._bvh_max_y;
      const right  = branch ? current._bvh_right : null;

      context.moveTo(min_x, min_y);
      context.lineTo(max_x, min_y);
      context.lineTo(max_x, max_y);
      context.lineTo(min_x, max_y);
      context.lineTo(min_x, min_y);

      if(right) {
        current       = right;
        traverse_left = true;
      }
      else {
        let parent = current._bvh_parent;

        if(parent) {
          while(parent && parent._bvh_right === current) {
            current = parent;
            parent  = current._bvh_parent;
          }

          current = parent;
        }
        else {
          break;
        }
      }
    }
  }
};

