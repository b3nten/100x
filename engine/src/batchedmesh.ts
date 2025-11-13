import {
	BatchedMesh,
	BufferGeometry,
	Camera,
	Material,
	Scene,
	WebGLRenderer,
} from "three";

export class BatchedLodMesh extends BatchedMesh {
	onBeforeRender(
		renderer: WebGLRenderer,
		scene: Scene,
		camera: Camera,
		geometry: BufferGeometry,
		material: Material,
	) {
		// if visibility has not changed and frustum culling and object sorting is not required
		// then skip iterating over all items
		if (
			!this._visibilityChanged &&
			!this.perObjectFrustumCulled &&
			!this.sortObjects
		) {
			return;
		}

		// the indexed version of the multi draw function requires specifying the start
		// offset in bytes.
		const index = geometry.getIndex();
		const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;

		const instanceInfo = this._instanceInfo;
		const multiDrawStarts = this._multiDrawStarts;
		const multiDrawCounts = this._multiDrawCounts;
		const geometryInfoList = this._geometryInfo;
		const perObjectFrustumCulled = this.perObjectFrustumCulled;
		const indirectTexture = this._indirectTexture;
		const indirectArray = indirectTexture.image.data;

		const frustum = camera.isArrayCamera ? _frustumArray : _frustum;
		// prepare the frustum in the local frame
		if (perObjectFrustumCulled && !camera.isArrayCamera) {
			_matrix
				.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
				.multiply(this.matrixWorld);

			_frustum.setFromProjectionMatrix(
				_matrix,
				camera.coordinateSystem,
				camera.reversedDepth,
			);
		}

		let multiDrawCount = 0;
		if (this.sortObjects) {
			// get the camera position in the local frame
			_matrix.copy(this.matrixWorld).invert();
			_vector.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_matrix);
			_forward
				.set(0, 0, -1)
				.transformDirection(camera.matrixWorld)
				.transformDirection(_matrix);

			for (let i = 0, l = instanceInfo.length; i < l; i++) {
				if (instanceInfo[i].visible && instanceInfo[i].active) {
					const geometryId = instanceInfo[i].geometryIndex;

					// get the bounds in world space
					this.getMatrixAt(i, _matrix);
					this.getBoundingSphereAt(geometryId, _sphere).applyMatrix4(_matrix);

					// determine whether the batched geometry is within the frustum
					let culled = false;
					if (perObjectFrustumCulled) {
						culled = !frustum.intersectsSphere(_sphere, camera);
					}

					if (!culled) {
						// get the distance from camera used for sorting
						const geometryInfo = geometryInfoList[geometryId];
						const z = _temp.subVectors(_sphere.center, _vector).dot(_forward);
						_renderList.push(geometryInfo.start, geometryInfo.count, z, i);
					}
				}
			}

			// Sort the draw ranges and prep for rendering
			const list = _renderList.list;
			const customSort = this.customSort;
			if (customSort === null) {
				list.sort(material.transparent ? sortTransparent : sortOpaque);
			} else {
				customSort.call(this, list, camera);
			}

			for (let i = 0, l = list.length; i < l; i++) {
				const item = list[i];
				multiDrawStarts[multiDrawCount] = item.start * bytesPerElement;
				multiDrawCounts[multiDrawCount] = item.count;
				indirectArray[multiDrawCount] = item.index;
				multiDrawCount++;
			}

			_renderList.reset();
		} else {
			for (let i = 0, l = instanceInfo.length; i < l; i++) {
				if (instanceInfo[i].visible && instanceInfo[i].active) {
					const geometryId = instanceInfo[i].geometryIndex;

					// determine whether the batched geometry is within the frustum
					let culled = false;
					if (perObjectFrustumCulled) {
						// get the bounds in world space
						this.getMatrixAt(i, _matrix);
						this.getBoundingSphereAt(geometryId, _sphere).applyMatrix4(_matrix);
						culled = !frustum.intersectsSphere(_sphere, camera);
					}

					if (!culled) {
						const geometryInfo = geometryInfoList[geometryId];
						multiDrawStarts[multiDrawCount] =
							geometryInfo.start * bytesPerElement;
						multiDrawCounts[multiDrawCount] = geometryInfo.count;
						indirectArray[multiDrawCount] = i;
						multiDrawCount++;
					}
				}
			}
		}

		indirectTexture.needsUpdate = true;
		this._multiDrawCount = multiDrawCount;
		this._visibilityChanged = false;
	}
}
