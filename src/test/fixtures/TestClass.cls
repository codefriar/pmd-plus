public class TestClass {
	public void badMethod() {
		// This should trigger PMD violations
		Integer i;
		if(i == null) {
			System.debug('Bad practice');
		}
	}
}
